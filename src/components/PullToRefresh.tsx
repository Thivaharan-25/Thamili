/**
 * Custom Pull-to-Refresh Component with Smooth Animation
 * Beautiful animated refresh indicator
 */

import React, { useEffect } from 'react';
import { View, Text, RefreshControl, RefreshControlProps } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors } from '../theme';

const AnimatedIcon = Animated.createAnimatedComponent(Icon);
const AnimatedView = Animated.createAnimatedComponent(View);

interface PullToRefreshProps extends RefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  colors?: string[];
  progressViewOffset?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  refreshing,
  onRefresh,
  tintColor = colors.primary[500],
  ...props
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (refreshing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
      scale.value = withRepeat(
        withTiming(1.2, { duration: 500 }),
        -1,
        true
      );
    } else {
      rotation.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [refreshing]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]}
      {...props}
    />
  );
};

export default PullToRefresh;

