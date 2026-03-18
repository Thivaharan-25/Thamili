/**
 * Centralized asset paths
 * This file provides a single source of truth for all asset imports
 */

export const ASSETS = {
  logo: require('../../assets/logo.png'),
  icon: require('../../assets/logo.png'),
  adaptiveIcon: require('../../assets/logo.png'), // Fallback as file is missing
  splashIcon: require('../../assets/logo.png'),   // Fallback as file is missing
  favicon: require('../../assets/favicon.png'),
} as const;

