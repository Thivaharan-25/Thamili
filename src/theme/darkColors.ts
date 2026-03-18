/**
 * Dark Mode Color Palette
 * Extended color system for dark theme
 */

export const darkColors = {
  // Primary colors (same as light, but adjusted for dark backgrounds)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#3A9FD1', // Main brand color
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  
  // Neutral colors (inverted for dark mode)
  neutral: {
    50: '#1A1A1A',
    100: '#2A2A2A',
    200: '#3A3A3A',
    300: '#4A4A4A',
    400: '#6A6A6A',
    500: '#8A8A8A',
    600: '#AAAAAA',
    700: '#CACACA',
    800: '#E0E0E0',
    900: '#FFFFFF',
  },
  
  // Background colors
  background: {
    default: '#121212',
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2A2A2A',
    card: '#1E1E1E',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    tertiary: '#808080',
    inverse: '#000000',
  },
  
  // Status colors (slightly adjusted for dark mode)
  success: {
    50: '#1B5E20',
    100: '#2E7D32',
    200: '#388E3C',
    300: '#43A047',
    400: '#4CAF50',
    500: '#66BB6A',
    600: '#81C784',
    700: '#A5D6A7',
    800: '#C8E6C9',
    900: '#E8F5E9',
  },
  
  error: {
    50: '#B71C1C',
    100: '#C62828',
    200: '#D32F2F',
    300: '#E53935',
    400: '#F44336',
    500: '#EF5350',
    600: '#E57373',
    700: '#EF9A9A',
    800: '#FFCDD2',
    900: '#FFEBEE',
  },
  
  warning: {
    50: '#E65100',
    100: '#EF6C00',
    200: '#F57C00',
    300: '#FB8C00',
    400: '#FF9800',
    500: '#FFA726',
    600: '#FFB74D',
    700: '#FFCC80',
    800: '#FFE0B2',
    900: '#FFF3E0',
  },
  
  info: {
    50: '#01579B',
    100: '#0277BD',
    200: '#0288D1',
    300: '#039BE5',
    400: '#03A9F4',
    500: '#29B6F6',
    600: '#4FC3F7',
    700: '#81D4FA',
    800: '#B3E5FC',
    900: '#E1F5FE',
  },
  
  // Border colors (for dark mode)
  border: {
    light: '#424242',
    default: '#616161',
    dark: '#9E9E9E',
  },

  // Glassmorphism (for dark mode)
  glass: {
    background: 'rgba(30, 30, 30, 0.8)',
    backgroundDark: 'rgba(18, 18, 18, 0.9)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
  },
};

