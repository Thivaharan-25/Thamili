import { useQuery } from '@tanstack/react-query';
import { deliveryService } from '../services/deliveryService';
import { DeliverySchedule, DeliveryStatus } from '../types';

export const useDeliveries = (partnerId: string, filters?: { status?: DeliveryStatus }) => {
  return useQuery<DeliverySchedule[]>({
    queryKey: ['deliveries', partnerId, filters],
    queryFn: async () => {
      return deliveryService.getDeliverySchedules({
        delivery_partner_id: partnerId,
        ...filters,
      });
    },
    enabled: !!partnerId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useDelivery = (scheduleId: string) => {
  return useQuery<DeliverySchedule | null>({
    queryKey: ['delivery', scheduleId],
    queryFn: () => deliveryService.getDeliveryScheduleById(scheduleId),
    enabled: !!scheduleId,
  });
};
