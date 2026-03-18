/**
 * TEST: CartItem Component Import
 * Test if CartItem (which imports expo-image) is causing the issue
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase (we know this works)
console.log('🔵 [TEST] Testing Supabase...');
const { supabase } = require('./src/services/supabase');
console.log('✅ [TEST] Supabase OK');

// Test CartItem directly
console.log('🔵 [TEST] Testing CartItem import...');
let CartItem: any = null;
let cartItemError: any = null;

try {
  CartItem = require('./src/components/CartItem').default;
  console.log('✅ [TEST] CartItem imported successfully');
  console.log('✅ [TEST] CartItem exists:', !!CartItem);
} catch (error: any) {
  cartItemError = error;
  console.error('❌ [TEST] CartItem import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
}

export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  if (cartItemError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>CartItem Test Failed</Text>
        <Text style={styles.error}>Check console for error</Text>
        <Text style={styles.errorDetail}>{cartItemError.message}</Text>
      </View>
    );
  }
  
  if (CartItem) {
    console.log('✅ [TEST] CartItem loaded, but not rendering (needs props)');
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CartItem Test</Text>
      <Text style={styles.subtitle}>
        {CartItem ? '✅ CartItem loaded successfully' : '❌ CartItem failed to load'}
      </Text>
      <Text style={styles.instruction}>Check console for details</Text>
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
    marginTop: 10,
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
  instruction: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
});

