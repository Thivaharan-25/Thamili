/**
 * TEST: Zustand Stores Import
 * Test if stores are causing the issue
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase (we know this works)
console.log('🔵 [TEST] Testing Supabase...');
const { supabase } = require('./src/services/supabase');
console.log('✅ [TEST] Supabase OK');

// Test Stores
console.log('🔵 [TEST] Testing Zustand stores...');
let useCartStore: any = null;
let useAuthStore: any = null;
let storesError: any = null;

try {
  const cartStore = require('./src/store/cartStore');
  const authStore = require('./src/store/authStore');
  useCartStore = cartStore.useCartStore;
  useAuthStore = authStore.useAuthStore;
  console.log('✅ [TEST] Stores imported successfully');
} catch (error: any) {
  storesError = error;
  console.error('❌ [TEST] Stores import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
}

export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  if (storesError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stores Test Failed</Text>
        <Text style={styles.error}>Check console for error</Text>
        <Text style={styles.errorDetail}>{storesError.message}</Text>
      </View>
    );
  }
  
  if (useCartStore) {
    const loadCart = useCartStore((state: any) => state.loadCart);
    
    React.useEffect(() => {
      console.log('🔵 [TEST] Testing store function...');
      try {
        loadCart();
        console.log('✅ [TEST] Store function works');
      } catch (error: any) {
        console.error('❌ [TEST] Store function failed:', error);
      }
    }, [loadCart]);
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stores Test</Text>
      <Text style={styles.subtitle}>Check console for results</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  error: {
    fontSize: 16,
    color: '#f00',
    textAlign: 'center',
    marginTop: 10,
  },
  errorDetail: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});
