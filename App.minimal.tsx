/**
 * MINIMAL TEST APP
 * Use this to test if basic React Native works
 * If this works, the issue is in dependencies/imports
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log('✅ MINIMAL APP LOADED - React Native is working!');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ Minimal App Works!</Text>
      <Text style={styles.subtext}>If you see this, React Native is fine.</Text>
      <Text style={styles.subtext}>The issue is in your imports/dependencies.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

