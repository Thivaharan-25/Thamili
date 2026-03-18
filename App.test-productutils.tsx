/**
 * TEST: productUtils Import
 * Test if productUtils is causing the issue directly
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase (we know this works)
console.log('🔵 [TEST] Testing Supabase...');
const { supabase } = require('./src/services/supabase');
console.log('✅ [TEST] Supabase OK');

// Test productUtils directly
console.log('🔵 [TEST] Testing productUtils import...');
let productUtils: any = null;
let productUtilsError: any = null;

try {
  productUtils = require('./src/utils/productUtils');
  console.log('✅ [TEST] productUtils imported successfully');
  console.log('✅ [TEST] productUtils exports:', Object.keys(productUtils));
} catch (error: any) {
  productUtilsError = error;
  console.error('❌ [TEST] productUtils import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
}

export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  if (productUtilsError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>productUtils Test Failed</Text>
        <Text style={styles.error}>Check console for error</Text>
        <Text style={styles.errorDetail}>{productUtilsError.message}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>productUtils Test</Text>
      <Text style={styles.subtitle}>
        {productUtils ? '✅ productUtils loaded successfully' : '❌ productUtils failed to load'}
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

