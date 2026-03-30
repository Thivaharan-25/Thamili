import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { Order, OrderStatus } from '../types';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useOrders = (userId: string, filters?: { status?: OrderStatus | 'all' }) => {
  const queryClient = useQueryClient();

  return useQuery<Order[]>({
    queryKey: QUERY_KEYS.orders(userId, filters?.status),
    queryFn: async () => {
      const orders = await orderService.getOrders(userId);
      if (filters?.status && filters.status !== 'all') {
        return orders.filter((order) => order.status === filters.status);
      }
      return orders;
    },
    placeholderData: () => {
      // Show all-orders cache while filtered query loads
      const allOrders = queryClient.getQueryData<Order[]>(QUERY_KEYS.orders(userId, undefined));
      if (!allOrders) return undefined;
      if (filters?.status && filters.status !== 'all') {
        return allOrders.filter((o) => o.status === filters.status);
      }
      return allOrders;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useOrder = (orderId: string) => {
  return useQuery<Order | null>({
    queryKey: QUERY_KEYS.order(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orderId,
  });
};

export const useOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.orderItems(orderId),
    queryFn: () => orderService.getOrderItems(orderId),
    enabled: !!orderId,
  });
};

