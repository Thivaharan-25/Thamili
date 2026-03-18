/**
 * TEST: Supabase Import
 * This tests if Supabase is causing the issue
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Test Supabase import
console.log('🔵 [TEST] Starting Supabase import test...');
try {
  const { supabase } = require('./src/services/supabase');
  console.log('✅ [TEST] Supabase imported successfully');
  console.log('✅ [TEST] Supabase client exists:', !!supabase);
} catch (error: any) {
  console.error('❌ [TEST] Supabase import FAILED:');
  console.error('❌ [TEST] Error message:', error.message);
  console.error('❌ [TEST] Error stack:', error.stack);
  console.error('❌ [TEST] Full error:', error);
}

export default function App() {
  console.log('✅ [TEST] App component rendering');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Import Test</Text>
      <Text style={styles.subtitle}>
        Check console for results
      </Text>
      <Text style={styles.instruction}>
        If you see "Supabase imported successfully" above,
        then Supabase is NOT the issue.
      </Text>
      <Text style={styles.instruction}>
        If you see an error, that's the problem!
      </Text>
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
    fontSize: 18,
    marginBottom: 10,
    color: '#666',
  },
  instruction: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    color: '#888',
  },
});

