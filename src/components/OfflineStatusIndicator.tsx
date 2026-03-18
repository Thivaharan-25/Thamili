/**
 * Offline Status Indicator
 * Shows a banner when the app is offline and displays queued actions
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { isOnline, getNetworkState } from '../utils/networkUtils';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { colors } from '../theme';
import { PerformanceIndicator } from './';

interface OfflineStatusIndicatorProps {
  onPress?: () => void;
}

// Helper function to get network speed label
const getNetworkSpeedLabel = (type: string, details?: any): string => {
  switch (type) {
    case 'wifi':
      return 'WiFi';
    case 'cellular':
      // Try to get cellular generation if available
      if (details?.cellularGeneration) {
        return details.cellularGeneration;
      }
      return '4G';
    case 'ethernet':
      return 'Ethernet';
    default:
      return 'Online';
  }
};

const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({ onPress }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const { queueLength } = useOfflineQueue();
  
  // Only use native driver on native platforms, not web
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    // Check initial network state
    checkNetworkState();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      
      if (offline) {
        // Slide in
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver,
          tension: 50,
          friction: 8,
        }).start();
      } else {
        // Slide out after a delay
        setTimeout(() => {
          Animated.spring(slideAnim, {
            toValue: -100,
            useNativeDriver,
            tension: 50,
            friction: 8,
          }).start();
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkNetworkState = async () => {
    const online = await isOnline();
    setIsOffline(!online);
    
    if (!online) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver,
        tension: 50,
        friction: 8,
      }).start();
    }
  };

  if (!isOffline && queueLength === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Icon 
          name={isOffline ? "wifi-off" : "wifi-check"} 
          size={20} 
          color="#FFFFFF" 
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOffline ? 'You\'re offline' : 'Back online'}
          </Text>
          <Text style={styles.message}>
            {isOffline 
              ? queueLength > 0 
                ? `${queueLength} action${queueLength > 1 ? 's' : ''} queued`
                : 'No internet connection'
              : 'All actions synced'}
          </Text>
        </View>
        {queueLength > 0 && (
          <TouchableOpacity
            onPress={onPress}
            style={styles.button}
            accessibilityLabel="View queued actions"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.warning[500],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48, // Account for status bar
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OfflineStatusIndicator;

