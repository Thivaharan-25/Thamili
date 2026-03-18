import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { canAccessRoute } from '../utils/rbac';
import Button from './Button';
import { useNavigation } from '@react-navigation/native';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'customer' | 'admin';
  fallback?: React.ReactNode;
}

/**
 * Route Guard Component
 * Protects routes based on user role
 */
const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  fallback,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const navigation = useNavigation();

  // If not authenticated, show login prompt
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authentication Required</Text>
        <Text style={styles.message}>
          Please login to access this page
        </Text>
        <Button
          title="Go to Login"
          onPress={() => navigation.navigate('Login' as never)}
          style={styles.button}
        />
      </View>
    );
  }

  // If role is required and user doesn't have it
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.message}>
          You don't have permission to access this page
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 200,
  },
});

export default RouteGuard;

