import { Order } from '../types';

/**
 * Filter orders by status
 */
export const filterOrdersByStatus = (
  orders: Order[],
  status: 'all' | Order['status']
): Order[] => {
  if (status === 'all') {
    return orders;
  }
  return orders.filter((order) => order.status === status);
};

/**
 * Search orders by order number
 */
export const searchOrders = (orders: Order[], searchQuery: string): Order[] => {
  if (!searchQuery.trim()) {
    return orders;
  }

  const query = searchQuery.toLowerCase();
  return orders.filter((order) =>
    order.id.toLowerCase().includes(query)
  );
};

/**
 * Sort orders by date (newest first)
 */
export const sortOrdersByDate = (orders: Order[], ascending: boolean = false): Order[] => {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Get filtered and sorted orders
 */
export const getFilteredOrders = (
  orders: Order[],
  options: {
    status?: 'all' | Order['status'];
    searchQuery?: string;
    sortBy?: 'date_asc' | 'date_desc';
  }
): Order[] => {
  let filtered = orders;

  // Filter by status
  if (options.status) {
    filtered = filterOrdersByStatus(filtered, options.status);
  }

  // Search
  if (options.searchQuery) {
    filtered = searchOrders(filtered, options.searchQuery);
  }

  // Sort
  if (options.sortBy) {
    filtered = sortOrdersByDate(filtered, options.sortBy === 'date_asc');
  }

  return filtered;
};

