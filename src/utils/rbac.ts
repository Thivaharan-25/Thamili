import { UserRole } from '../types';

/**
 * Role-Based Access Control Utilities
 */

/**
 * Check if user has a specific role
 */
export const hasRole = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  // Admin has access to everything
  if (userRole === 'admin') return true;
  
  // Customer only has access to customer features
  return userRole === requiredRole;
};

/**
 * Check if user is admin
 */
export const isAdmin = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin';
};

/**
 * Check if user is customer
 */
export const isCustomer = (userRole: UserRole | undefined): boolean => {
  return userRole === 'customer';
};

/**
 * Get accessible routes based on role
 */
export const getAccessibleRoutes = (userRole: UserRole | undefined): string[] => {
  if (!userRole) return ['Login', 'Register'];
  
  if (userRole === 'admin') {
    return [
      'Main',
      'Dashboard',
      'Products',
      'Orders',
      'PickupPoints',
      'Profile',
      'Settings',
      'ProductDetails',
      'OrderDetails',
    ];
  }
  
  // Customer routes
  return [
    'Main',
    'Home',
    'Products',
    'Cart',
    'Orders',
    'Profile',
    'Settings',
    'ProductDetails',
    'Checkout',
    'OrderConfirmation',
    'OrderDetails',
  ];
};

/**
 * Check if route is accessible for role
 */
export const canAccessRoute = (
  route: string,
  userRole: UserRole | undefined
): boolean => {
  const accessibleRoutes = getAccessibleRoutes(userRole);
  return accessibleRoutes.includes(route);
};

