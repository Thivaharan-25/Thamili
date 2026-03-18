/**
 * Network Error Handler Component
 * Detects network errors and shows animated error state
 */

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
// Network detection - use expo-network if available, otherwise mock
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  // Fallback for Expo Go
  NetInfo = {
    addEventListener: (callback: any) => {
      // Mock network state - always connected in Expo Go
      callback({ isConnected: true });
      return () => {};
    },
  };
}
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';
import ErrorMessage from './ErrorMessage';
import Button from './Button';

const AnimatedView = Animated.createAnimatedComponent(View);

interface NetworkErrorHandlerProps {
  onRetry?: () => void;
  showWhenOffline?: boolean;
  children: React.ReactNode;
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  onRetry,
  showWhenOffline = true,
  children,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const slideY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);

      if (!connected && showWhenOffline) {
        setWasOffline(true);
        slideY.value = withSpring(0, EASING.spring);
        opacity.value = withTiming(1, { duration: 300 });
      } else if (connected && wasOffline) {
        // Animate out when connection is restored
        slideY.value = withTiming(-100, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          setWasOffline(false);
        });
      }
    });

    return () => unsubscribe();
  }, [wasOffline]);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: opacity.value,
  }));

  if (!showWhenOffline || (!wasOffline && isConnected)) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1">
      {children}
      
      {!isConnected && (
        <AnimatedView
          style={[
            bannerStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
            },
          ]}
          className="bg-error-500 px-4 py-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Icon name="wifi-off" size={20} color="white" />
              <Text className="text-white font-semibold ml-2 flex-1">
                No Internet Connection
              </Text>
            </View>
            {onRetry && (
              <Button
                title="Retry"
                onPress={onRetry}
                variant="outline"
                size="sm"
                textStyle={{ color: 'white' }}
                style={{ borderColor: 'white' }}
              />
            )}
          </View>
        </AnimatedView>
      )}
    </View>
  );
};

export default NetworkErrorHandler;

