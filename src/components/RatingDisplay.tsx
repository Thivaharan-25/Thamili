/**
 * Rating Display Component
 * Shows star ratings with visual feedback
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';

interface RatingDisplayProps {
  rating: number; // 0-5
  maxRating?: number;
  size?: number;
  showNumber?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  color?: string;
  style?: any;
  animated?: boolean;
}

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  maxRating = 5,
  size = 16,
  showNumber = false,
  showCount = false,
  reviewCount,
  color = colors.warning[500],
  style,
  animated = true,
}) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (animated) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, EASING.spring)
      );
    }
  }, [rating, animated]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {Array.from({ length: fullStars }).map((_, index) => (
          <AnimatedIcon
            key={`full-${index}`}
            name="star"
            size={size}
            color={color}
            style={animated ? iconStyle : undefined}
          />
        ))}
        {hasHalfStar && (
          <AnimatedIcon
            key="half"
            name="star-half-full"
            size={size}
            color={color}
            style={animated ? iconStyle : undefined}
          />
        )}
        {Array.from({ length: emptyStars }).map((_, index) => (
          <AnimatedIcon
            key={`empty-${index}`}
            name="star-outline"
            size={size}
            color={colors.neutral[300]}
            style={animated ? iconStyle : undefined}
          />
        ))}
      </View>
      {showNumber && (
        <Text style={[styles.ratingText, { fontSize: size }]}>
          {rating.toFixed(1)}
        </Text>
      )}
      {showCount && reviewCount !== undefined && (
        <Text style={styles.countText}>({reviewCount})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontWeight: '600',
    color: colors.neutral[700],
    marginLeft: 4,
  },
  countText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 4,
  },
});

export default RatingDisplay;

