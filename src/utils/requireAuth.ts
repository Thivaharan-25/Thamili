/**
 * Utility function to check authentication and prompt user to login/register
 * Returns true if authenticated, false otherwise
 * If not authenticated, shows an alert and navigates to login/register
 */

import { Alert } from 'react-native';

interface RequireAuthOptions {
  navigation: any; // Using any to support different navigation types
  isAuthenticated: boolean;
  title?: string;
  message?: string;
  onCancel?: () => void;
  t?: (key: string) => string;
}

export const requireAuth = (options: RequireAuthOptions): boolean => {
  const {
    navigation,
    isAuthenticated,
    title,
    message,
    onCancel,
    t,
  } = options;

  if (isAuthenticated) {
    return true;
  }

  const defaultTitle = t?.('auth.loginRequired') || 'Create Account to Order';
  const defaultMessage = t?.('auth.loginToAddCart') || 'Sign up now to add items to cart and start ordering fresh products!';
  const cancelText = t?.('common.cancel') || 'Continue Browsing';
  const loginText = t?.('auth.login') || 'Login';
  const registerText = t?.('auth.register') || 'Sign Up Free';

  Alert.alert(
    title || defaultTitle,
    message || defaultMessage,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: loginText,
        onPress: () => {
          (navigation as any).navigate('Login');
        },
      },
      {
        text: registerText,
        onPress: () => {
          (navigation as any).navigate('Register');
        },
        style: 'default',
      },
    ],
    { cancelable: true }
  );

  return false;
};

