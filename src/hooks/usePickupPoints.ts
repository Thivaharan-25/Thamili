import { useQuery } from '@tanstack/react-query';
import { pickupPointService } from '../services/pickupPointService';
import { PickupPoint } from '../types';
import { useProductStore } from '../store/productStore';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/requestTimeout';
import { QUERY_KEYS } from '../constants/queryKeys';

export const usePickupPoints = (country?: string) => {
  const setPickupPoints = useProductStore((state) => state.setPickupPoints);
  const cachedPoints = useProductStore((state) => state.pickupPoints);

  return useQuery<PickupPoint[]>({
    queryKey: QUERY_KEYS.pickupPoints(country),
    queryFn: async () => {
      const points = await withTimeout(
        pickupPointService.getPickupPoints(country),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to fetch pickup points: request timed out',
        }
      );
      
      if (points && points.length > 0) {
        setPickupPoints(points);
      }
      
      return points;
    },
    // Use cached points as placeholder data
    placeholderData: cachedPoints.length > 0 ? cachedPoints : undefined,
    staleTime: 1000 * 60 * 60, // 1 hour (pickup points change rarely)
  });
};
