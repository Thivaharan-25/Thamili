/**
 * TEST: i18n Import
 * Test if i18n is causing the issue
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase (we know this works)
console.log('🔵 [TEST] Testing Supabase...');
const { supabase } = require('./src/services/supabase');
console.log('✅ [TEST] Supabase OK');

// Test i18n
console.log('🔵 [TEST] Testing i18n import...');
let i18nError: any = null;

try {
  require('./src/i18n');
  console.log('✅ [TEST] i18n imported successfully');
} catch (error: any) {
  i18nError = error;
  console.error('❌ [TEST] i18n import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
}

export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  if (i18nError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>i18n Test Failed</Text>
        <Text style={styles.error}>Check console for error</Text>
        <Text style={styles.errorDetail}>{i18nError.message}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>i18n Test</Text>
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
