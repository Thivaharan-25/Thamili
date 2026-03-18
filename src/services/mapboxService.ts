/**
 * Mapbox Service
 * Handles Mapbox API interactions including geocoding
 */

import { ENV } from '../config/env';
import { supabase } from './supabase';
import { checkRateLimit } from '../utils/rateLimiter';

const MAPBOX_PUBLIC_KEY = ENV.MAPBOX_PUBLIC_KEY;
const MAPBOX_GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/**
 * Get Mapbox Secret Key from database (for server-side operations)
 * This is stored securely in the app_config table with RLS policies
 */
export const getMapboxSecretKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'mapbox_secret_key')
      .single();

    if (error) {
      console.error('Error fetching Mapbox secret key:', error);
      return null;
    }

    return data?.value || null;
  } catch (error) {
    console.error('Error in getMapboxSecretKey:', error);
    return null;
  }
};

/**
 * Reverse geocoding: Convert coordinates to address
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Address information
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<{
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
} | null> => {
  checkRateLimit('mapbox');
  try {
    if (!MAPBOX_PUBLIC_KEY) {
      console.error('Mapbox public key not configured');
      return null;
    }

    // Request all useful types — Mapbox returns most specific first
    // neighborhood/locality serve as street-level fallback for areas without mapped street data
    const url = `${MAPBOX_GEOCODING_API}/${longitude},${latitude}.json?access_token=${MAPBOX_PUBLIC_KEY}&types=address,neighborhood,locality,place,postcode&language=en`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results found');
      return null;
    }

    const features: any[] = data.features;

    // Pick dedicated feature for each data type
    const addressFeature      = features.find((f) => f.place_type.includes('address'));
    const neighborhoodFeature = features.find((f) =>
      f.place_type.includes('neighborhood') || f.place_type.includes('locality')
    );
    const placeFeature    = features.find((f) => f.place_type.includes('place'));
    const postcodeFeature = features.find((f) => f.place_type.includes('postcode'));

    // ── Street ─────────────────────────────────────────────────────────────
    // Priority 1: address feature (specific street + house number)
    // Priority 2: neighborhood/locality (for areas without mapped street data)
    // Priority 3: empty — user types it manually
    let street = '';
    if (addressFeature) {
      const streetName  = addressFeature.text    || '';   // e.g. "Hauptstraße"
      const houseNumber = addressFeature.address || '';   // e.g. "5"
      // European format: street name followed by house number
      street = houseNumber ? `${streetName} ${houseNumber}` : streetName;
    } else if (neighborhoodFeature) {
      street = neighborhoodFeature.text || '';
    }

    // ── City ───────────────────────────────────────────────────────────────
    // Prefer the dedicated place feature; fall back to address feature's context
    let city = placeFeature?.text || '';
    if (!city && addressFeature?.context) {
      const placeCtx = (addressFeature.context as any[]).find((c) => c.id.startsWith('place'));
      if (placeCtx) city = placeCtx.text;
    }

    // ── Postal code ────────────────────────────────────────────────────────
    // Prefer the dedicated postcode feature; fall back to address feature's context
    let postalCode = postcodeFeature?.text || '';
    if (!postalCode && addressFeature?.context) {
      const pcCtx = (addressFeature.context as any[]).find((c) => c.id.startsWith('postcode'));
      if (pcCtx) postalCode = pcCtx.text;
    }

    // ── Country ────────────────────────────────────────────────────────────
    // Scan context of all features to find country
    let country = '';
    for (const f of features) {
      const countryCtx = (f.context || []).find((c: any) => c.id.startsWith('country'));
      if (countryCtx) { country = countryCtx.text; break; }
    }

    const fullAddress = addressFeature?.place_name || placeFeature?.place_name || features[0]?.place_name || '';

    return { address: street, city, postalCode, country, fullAddress };
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    return null;
  }
};

/**
 * Forward geocoding: Convert address to coordinates
 * @param address - Address string to geocode
 * @param country - Optional country code to limit search (e.g., 'de', 'dk')
 * @returns Coordinates and address information
 */
export const forwardGeocode = async (
  address: string,
  country?: 'de' | 'dk'
): Promise<{
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  postalCode?: string;
} | null> => {
  checkRateLimit('mapbox');
  try {
    if (!MAPBOX_PUBLIC_KEY) {
      console.error('Mapbox public key not configured');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    let url = `${MAPBOX_GEOCODING_API}/${encodedAddress}.json?access_token=${MAPBOX_PUBLIC_KEY}`;

    // Add country filter if provided
    if (country) {
      url += `&country=${country}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    const features: any[] = data.features;
    const feature = features[0];
    const [longitude, latitude] = feature.center;

    // City: from place-type feature or from context of the result
    const placeFeature = features.find((f) => f.place_type.includes('place'));
    let city = placeFeature?.text || '';
    if (!city) {
      const placeCtx = (feature.context || []).find((c: any) => c.id.startsWith('place'));
      if (placeCtx) city = placeCtx.text;
    }

    // Postcode: from postcode-type feature or from context
    const postcodeFeature = features.find((f) => f.place_type.includes('postcode'));
    let postalCode = postcodeFeature?.text || '';
    if (!postalCode) {
      const pcCtx = (feature.context || []).find((c: any) => c.id.startsWith('postcode'));
      if (pcCtx) postalCode = pcCtx.text;
    }

    return {
      latitude,
      longitude,
      address: feature.place_name,
      city,
      postalCode,
    };
  } catch (error) {
    console.error('Error in forwardGeocode:', error);
    return null;
  }
};

export const mapboxService = {
  getMapboxSecretKey,
  reverseGeocode,
  forwardGeocode,
};
