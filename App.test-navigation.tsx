/**
 * TEST: Navigation Import
 * Test if navigation is causing the issue
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase (we know this works)
console.log('🔵 [TEST] Testing Supabase...');
const { supabase } = require('./src/services/supabase');
console.log('✅ [TEST] Supabase OK');

// Test Navigation
console.log('🔵 [TEST] Testing Navigation import...');
let AppNavigator: any = null;
let navigationError: any = null;

try {
  AppNavigator = require('./src/navigation/AppNavigator').default;
  console.log('✅ [TEST] Navigation imported successfully');
  console.log('✅ [TEST] AppNavigator exists:', !!AppNavigator);
} catch (error: any) {
  navigationError = error;
  console.error('❌ [TEST] Navigation import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
}

// Export component
export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  if (navigationError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Navigation Test Failed</Text>
        <Text style={styles.error}>Check console for error</Text>
        <Text style={styles.errorDetail}>{navigationError.message}</Text>
      </View>
    );
  }
  
  if (AppNavigator) {
    console.log('✅ [TEST] Rendering AppNavigator');
    return <AppNavigator />;
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation Test</Text>
      <Text style={styles.subtitle}>Loading...</Text>
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
