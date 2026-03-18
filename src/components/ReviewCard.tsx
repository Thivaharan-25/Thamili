/**
 * Review Card Component
 * Displays customer reviews with ratings
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';
import RatingDisplay from './RatingDisplay';
import { formatDate } from '../utils/regionalFormatting';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
}

interface ReviewCardProps {
  review: Review;
  country?: Country;
  style?: any;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  country = COUNTRIES.GERMANY,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withSpring(1, EASING.spring);
    translateY.value = withSpring(0, EASING.spring);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <AnimatedView style={[styles.container, animatedStyle, style]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Icon name="account" size={20} color={colors.primary[500]} />
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{review.userName}</Text>
              {review.verified && (
                <Icon
                  name="check-circle"
                  size={16}
                  color={colors.success[500]}
                  style={styles.verifiedIcon}
                />
              )}
            </View>
            <Text style={styles.date}>
              {formatDate(review.date, country)}
            </Text>
          </View>
        </View>
        <RatingDisplay rating={review.rating} size={14} showNumber={false} />
      </View>
      <Text style={styles.comment}>{review.comment}</Text>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  date: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral[700],
  },
});

export default ReviewCard;

