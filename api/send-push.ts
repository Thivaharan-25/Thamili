import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');

  // Auth guard
  if (INTERNAL_API_SECRET) {
    const providedSecret = req.headers['x-internal-secret'];
    if (!providedSecret || providedSecret !== INTERNAL_API_SECRET) {
      console.warn('[send-push] Rejected: invalid or missing x-internal-secret header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields: userId, title, body' });
  }

  try {
    console.log(`[send-push] Processing push for userId: ${userId}`);

    // 1. Fetch user's push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }); // Most recent first

    if (tokenError) {
      console.error('[send-push] DB error fetching tokens:', tokenError);
      throw tokenError;
    }

    if (!tokens || tokens.length === 0) {
      console.warn(`[send-push] No push tokens found for user: ${userId}`);
      return res.status(404).json({ error: 'No push tokens found for user.' });
    }

    // Filter valid Expo tokens
    const validTokens = tokens
      .map(t => t.push_token)
      .filter(token => typeof token === 'string' && (
        token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
      ));

    if (validTokens.length === 0) {
      console.warn(`[send-push] No valid Expo tokens for user: ${userId}`);
      return res.status(422).json({ error: 'No valid Expo push tokens found.' });
    }

    // Use only the most recent token to avoid hitting stale tokens
    // This prevents DeviceNotRegistered errors from dead tokens
    const activeToken = validTokens[0];
    console.log(`[send-push] Sending to most recent token for user ${userId}: ${activeToken.substring(0, 30)}...`);

    // 2. Send to Expo Push API
    const message = {
      to: activeToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json() as any;
    console.log('[send-push] Expo Push API raw response:', JSON.stringify(result));

    // 3. Check Expo ticket for errors
    const ticket = result?.data;
    if (ticket) {
      if (ticket.status === 'error') {
        const expoError = ticket.details?.error;
        console.error(`[send-push] ❌ Expo ticket error: ${ticket.message} | code: ${expoError}`);

        // Auto-cleanup: remove token if device is no longer registered
        if (expoError === 'DeviceNotRegistered') {
          console.warn(`[send-push] Removing dead token for user ${userId}: ${activeToken.substring(0, 30)}...`);
          await supabase
            .from('user_push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('push_token', activeToken);

          return res.status(410).json({
            error: 'Device not registered. Token removed. User must re-open app to re-register.',
            expoError,
          });
        }

        if (expoError === 'InvalidCredentials') {
          console.error('[send-push] ❌ FCM credentials are invalid! Re-upload FCM V1 key via: eas credentials');
          return res.status(500).json({ error: 'Push credentials invalid. FCM key needs to be re-uploaded.' });
        }

        if (expoError === 'MessageTooBig') {
          return res.status(400).json({ error: 'Notification payload too large.' });
        }

        return res.status(500).json({ error: ticket.message || 'Expo push failed', expoError });
      }

      if (ticket.status === 'ok') {
        console.log(`[send-push] ✅ Expo accepted push. Ticket ID: ${ticket.id}`);
      }
    }

    return res.status(200).json({ success: true, result });

  } catch (error: any) {
    console.error('[send-push] Internal error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
