// Lazy import Supabase to avoid initialization during module load
import { PickupPoint } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/requestTimeout';

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}

export const pickupPointService = {
  /**
   * Get all pickup points
   */
  async getPickupPoints(country?: string, includeInactive: boolean = false): Promise<PickupPoint[]> {
    try {
      const supabase = getSupabase();
      // Fetch all points first to simplify debugging and avoid potential SQL filter issues
      // associated with different Supabase versions or column formatting.
      const query = supabase
        .from('pickup_points')
        .select('*')
        .order('name', { ascending: true });

      const { data, error } = (await withTimeout(
        query,
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to fetch pickup points: request timed out',
        }
      )) as any;

      if (error) {
        throw error;
      }

      let points = (data || []) as PickupPoint[];

      // DEBUG: Log all countries available in DB to understand mismatch
      const allRawCountries = [...new Set(points.map(p => p.country || 'NULL'))];
      const activeCount = points.filter(p => p.active !== false).length;
      console.warn(`📊 [pickupPointService] DB Check: Found ${points.length} points total. Active: ${activeCount}. Countries in DB: ${JSON.stringify(allRawCountries)}`);

      // Filter in JS for maximum reliability
      // 1. Filter by active (unless includeInactive is true)
      if (!includeInactive) {
        points = points.filter(p => p.active !== false);
      }

      // 2. Filter by country if provided
      if (country) {
        const searchCountry = country.toLowerCase().trim();
        const filteredPoints = points.filter(p => {
          if (!p.country) return true; // Include points with no country assigned as fallbacks
          const pointCountry = p.country.toLowerCase().trim();
          return pointCountry === searchCountry || pointCountry.includes(searchCountry);
        });
        
        if (filteredPoints.length === 0 && points.length > 0) {
          console.warn(`⚠️ [pickupPointService] Filter yielded 0 points for "${country}". Total active points available: ${points.length}. Countries available: ${JSON.stringify([...new Set(points.map(p => p.country))])}`);
        }
        
        points = filteredPoints;
      }

      console.warn(`✅ [pickupPointService] Returning ${points.length} points for country: ${country || 'all'}`);
      return points;
    } catch (error) {
      console.error('Error fetching pickup points:', error);
      throw error;
    }
  },

  /**
   * Get a single pickup point by ID
   */
  async getPickupPointById(pickupPointId: string): Promise<PickupPoint | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = (await withTimeout(
        supabase
          .from('pickup_points')
          .select('*')
          .eq('id', pickupPointId)
          .single(),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to fetch pickup point: request timed out',
        }
      )) as any;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching pickup point:', error);
      throw error;
    }
  },

  /**
   * Create a new pickup point (Admin only)
   */
  async createPickupPoint(
    pickupPoint: Omit<PickupPoint, 'id' | 'created_at'>
  ): Promise<PickupPoint> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('pickup_points')
        .insert(pickupPoint)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating pickup point:', error);
      throw error;
    }
  },

  /**
   * Update a pickup point (Admin only)
   */
  async updatePickupPoint(
    pickupPointId: string,
    updates: Partial<PickupPoint>
  ): Promise<PickupPoint> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('pickup_points')
        .update(updates)
        .eq('id', pickupPointId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating pickup point:', error);
      throw error;
    }
  },

  /**
   * Delete a pickup point (Admin only)
   */
  async deletePickupPoint(pickupPointId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('pickup_points')
        .delete()
        .eq('id', pickupPointId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting pickup point:', error);
      throw error;
    }
  },

  /**
   * Find nearest pickup point based on coordinates
   */
  async findNearestPickupPoint(
    latitude: number,
    longitude: number,
    country: 'germany' | 'denmark' = 'germany'
  ): Promise<PickupPoint | null> {
    try {
      const allPoints = await this.getPickupPoints(country);
      
      if (!allPoints.length) return null;

      let nearestPoint: PickupPoint | null = null;
      let minDistance = Infinity;

      for (const point of allPoints) {
        if (point.latitude && point.longitude) {
          const distance = getHaversineDistance(
            latitude,
            longitude,
            point.latitude,
            point.longitude
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
          }
        }
      }

      return nearestPoint;
    } catch (error) {
      console.error('Error finding nearest pickup point:', error);
      // Fallback to first available point if calculation fails
      const allPoints = await this.getPickupPoints(country);
      return allPoints[0] || null;
    }
  }
};

/**
 * Calculates distance between two coordinates in km using Haversine formula
 */
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
