/**
 * Vercel Serverless Function: Create User via Supabase Admin API
 * 
 * This function bypasses Supabase email validation by using the Admin API
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Usage:
 * POST /api/create-user
 * Body: { phone: "+491234567890", username: "baasith6", password: "password123", name: "Baasith" }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for all responses
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { phone, username, password, name } = request.body;

    if (!phone || !username || !password || !name) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      return response.status(400).json({
        error: 'Phone, username, password, and name are required',
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      return response.status(500).json({
        error: 'Supabase credentials not configured',
      });
    }

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Create admin client (bypasses RLS and email validation)
    // Use service role key to get admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      autoRefreshToken: false,
      persistSession: false,
    });

    // Create email from username (no validation with Admin API!)
    const email = `${username}@thamili.app`;

    // Check if username or phone already exists
    // Use separate queries to avoid .single() error when no results
    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (existingUsername) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      return response.status(400).json({
        error: 'Username already taken',
      });
    }

    const { data: existingPhone } = await supabaseAdmin
      .from('users')
      .select('id, phone')
      .eq('phone', formattedPhone)
      .limit(1)
      .maybeSingle();

    if (existingPhone) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      return response.status(400).json({
        error: 'Phone number already registered',
      });
    }

    // Create user using Admin API (bypasses email validation!)
    // Use REST API directly if admin client is not available
    let authData, authError;

    const auth = supabaseAdmin.auth as any;
    if (auth && auth.admin && auth.admin.createUser) {
      // Use admin client if available
      try {
        const result = await auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Auto-confirm email (no verification needed)
          user_metadata: {
            name: name,
            phone: formattedPhone,
            username: username,
          },
        });
        authData = result.data;
        authError = result.error;
      } catch (adminError: any) {
        console.error('Admin API call failed:', adminError);
        authError = adminError;
        authData = null;
      }
    } else {
      // Fallback: Use REST API directly
      console.log('Admin client not available, using REST API directly');
      try {
        const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
              name: name,
              phone: formattedPhone,
              username: username,
            },
          }),
        });

        const createUserData = await createUserResponse.json();

        if (!createUserResponse.ok) {
          authError = createUserData;
          authData = null;
        } else {
          authData = { user: createUserData };
          authError = null;
        }
      } catch (restError: any) {
        console.error('REST API call failed:', restError);
        authError = restError;
        authData = null;
      }
    }

    if (authError || !authData.user) {
      console.error('Admin API create user error:', authError);
      console.error('Error details:', JSON.stringify(authError, null, 2));
      response.setHeader('Access-Control-Allow-Origin', '*');
      return response.status(400).json({
        error: authError?.message || 'Failed to create user',
        details: authError?.status ? `Status: ${authError.status}` : undefined,
      });
    }

    // Update user profile in database
    // Note: Trigger might create the user record, so we use upsert
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: email,
        username: username,
        phone: formattedPhone,
        name: name,
        role: 'customer',
      }, {
        onConflict: 'id',
      });

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      // Don't fail if profile update fails - user is created by trigger
    }

    // Generate a session token for the user
    // We'll return the user data and let the client create a session
    response.setHeader('Access-Control-Allow-Origin', '*');
    return response.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: email,
        username: username,
        phone: formattedPhone,
        name: name,
        role: 'customer',
        created_at: authData.user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    response.setHeader('Access-Control-Allow-Origin', '*');
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
      type: error.name || 'Error',
    });
  }
}

