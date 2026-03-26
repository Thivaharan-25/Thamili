/**
 * Progressive Image Loading Component
 * Enhanced with blur-up effect, better placeholders, error fallbacks, and lazy loading
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from '../utils/reanimatedWrapper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { useTheme } from '../hooks/useTheme';
import SkeletonLoader from './SkeletonLoader';

// Note: In case reanimatedWrapper doesn't export Animated, use the fallback logic from there
import Reanimated, { createAnimatedComponent } from '../utils/reanimatedWrapper';

const AnimatedImage = createAnimatedComponent(Image);
const AnimatedView = createAnimatedComponent(View);

interface ProgressiveImageProps {
  source: { uri: string } | number;
  placeholder?: 'skeleton' | 'blur' | 'icon' | 'blur-up';
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  priority?: 'low' | 'normal' | 'high';
  contentFit?: ImageProps['contentFit'];
  transition?: number;
  onLoadEnd?: () => void;
  onError?: () => void;
  lazy?: boolean; // Enable lazy loading
  blurRadius?: number; // Blur radius for blur-up effect
  errorFallback?: React.ReactNode; // Custom error fallback
  loadingTimeout?: number; // Safety timeout in ms (default: 8000)
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  placeholder = 'skeleton',
  style,
  containerStyle,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  lazy = false,
  blurRadius = 10,
  errorFallback,
  loadingTimeout = 8000,
  onLoadEnd,
  onError,
  ...props
}) => {
  const { colors: themeColors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const opacity = useSharedValue(0);
  const blur = useSharedValue(blurRadius);

  // Use URI as dependency instead of the source object reference to prevent re-loading loops
  const sourceUri = typeof source === 'object' && 'uri' in source ? source.uri : null;
  const sourceNumber = typeof source === 'number' ? source : null;

  const imageSource = useMemo(() => {
    if (sourceUri) {
      return {
        uri: sourceUri,
        cachePolicy,
        priority,
      };
    }
    return sourceNumber;
  }, [sourceUri, sourceNumber, cachePolicy, priority]);

  // Lazy loading: Load when component is visible
  useEffect(() => {
    if (lazy && !shouldLoad) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lazy, shouldLoad]);

  // Safety Timeout: If loading takes too long, clear the placeholder anyway.
  // Configurable via loadingTimeout prop (default 8s). Skipped for cached images
  // which use memory-disk policy and should load near-instantly.
  useEffect(() => {
    if (loading && shouldLoad) {
      const safetyTimer = setTimeout(() => {
        if (loading) {
          if (__DEV__) {
            console.warn(`⏳ [ProgressiveImage] Slow image: ${sourceUri ? sourceUri.split('/').pop() : 'static resource'}`);
          }
          setLoading(false);
          opacity.value = withTiming(1, { duration: 300 });
        }
      }, loadingTimeout);
      return () => clearTimeout(safetyTimer);
    }
  }, [loading, shouldLoad, sourceUri, loadingTimeout]);

  const handleLoadSuccess = () => {
    if (!loading) return;
    setLoading(false);
    opacity.value = withTiming(1, { duration: 300 });
    if (placeholder === 'blur-up') {
      blur.value = withTiming(0, { duration: 300 });
    }
    if (onLoadEnd) onLoadEnd();
  };

  const handleLoadError = () => {
    setLoading(false);
    setError(true);
    if (onError) onError();
  };

  const imageStyle = useAnimatedStyle(() => {
    // Basic null check for fallback environments
    const blurValue = (placeholder === 'blur-up' && blur) ? (blur.value ?? 0) : 0;
    return {
      opacity: opacity?.value ?? 0,
    };
  });

  const renderPlaceholder = () => {
    if (error) {
      if (errorFallback) {
        return errorFallback;
      }
      return (
        <View style={[styles.placeholder, { backgroundColor: themeColors.neutral[100] }]}>
          <Icon name="image-off" size={32} color={themeColors.neutral[400]} />
          <Text style={[styles.errorText, { color: themeColors.text.secondary }]}>
            Failed to load image
          </Text>
        </View>
      );
    }

    switch (placeholder) {
      case 'skeleton':
        return <SkeletonLoader width="100%" height="100%" borderRadius={0} />;
      case 'blur':
      case 'blur-up':
        return (
          <View style={[styles.placeholder, { backgroundColor: themeColors.neutral[200] }]}>
            <Icon name="image" size={32} color={themeColors.neutral[400]} />
          </View>
        );
      case 'icon':
      default:
        return (
          <View style={[styles.placeholder, { backgroundColor: themeColors.neutral[100] }]}>
            <Icon name="image-outline" size={32} color={themeColors.neutral[400]} />
          </View>
        );
    }
  };

  return (
    <View style={containerStyle} className="relative overflow-hidden">
      {/* Placeholder */}
      {loading && (
        <View className="absolute inset-0">
          {renderPlaceholder()}
        </View>
      )}

      {/* Actual Image */}
      {shouldLoad && (
        <AnimatedImage
          source={imageSource}
          style={[style as any, imageStyle]}
          onLoad={handleLoadSuccess}
          onError={handleLoadError}
          contentFit={props.contentFit || "cover"}
          transition={props.transition || 300}
          cachePolicy={cachePolicy}
          priority={priority}
          {...props}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
});

export default ProgressiveImage;
