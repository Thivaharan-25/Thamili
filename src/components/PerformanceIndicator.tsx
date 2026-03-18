/**
 * Performance Indicator Component
 * Shows loading progress, network speed, and cache status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PerformanceIndicatorProps {
  showNetworkSpeed?: boolean;
  showCacheStatus?: boolean;
  style?: any;
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  showNetworkSpeed = true,
  showCacheStatus = true,
  style,
}) => {
  const { colors: themeColors } = useTheme();
  const [networkSpeed, setNetworkSpeed] = useState<string>('');
  const [cacheSize, setCacheSize] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);

  const getNetworkSpeedLabel = (type: string): string => {
    switch (type) {
      case 'wifi':
        return 'WiFi';
      case 'cellular':
        return '4G';
      case 'ethernet':
        return 'Ethernet';
      default:
        return 'Online';
    }
  };

  const calculateCacheSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      setCacheSize(`${sizeInMB} MB`);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      setCacheSize('Unknown');
    }
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToKeep = ['@thamili_user_data', '@thamili_cart', '@thamili_country'];
      const keysToRemove = keys.filter((key) => !keysToKeep.includes(key));
      
      await AsyncStorage.multiRemove(keysToRemove);
      await calculateCacheSize();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected && state.type) {
        const speed = getNetworkSpeedLabel(state.type);
        setNetworkSpeed(speed);
      } else {
        setNetworkSpeed('Offline');
      }
    });

    // Calculate cache size
    calculateCacheSize();

    return () => {
      unsubscribe();
    };
  }, []);

  if (!showNetworkSpeed && !showCacheStatus) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.card }, style]}>
      {showNetworkSpeed && (
        <View style={styles.item}>
          <Icon
            name={isOnline ? 'wifi' : 'wifi-off'}
            size={16}
            color={isOnline ? themeColors.success[500] : themeColors.error[500]}
          />
          <Text style={[styles.label, { color: themeColors.text.secondary }]}>
            {networkSpeed || 'Checking...'}
          </Text>
        </View>
      )}
      
      {showCacheStatus && (
        <TouchableOpacity
          style={styles.item}
          onPress={clearCache}
          accessibilityLabel="Clear cache"
          accessibilityRole="button"
        >
          <Icon name="database" size={16} color={themeColors.primary[500]} />
          <Text style={[styles.label, { color: themeColors.text.secondary }]}>
            Cache: {cacheSize}
          </Text>
          <Icon name="delete-outline" size={14} color={themeColors.text.tertiary} style={styles.clearIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
  },
  clearIcon: {
    marginLeft: 4,
  },
});

export default PerformanceIndicator;

