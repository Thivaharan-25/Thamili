/**
 * Onboarding Screen - Main onboarding flow coordinator
 * Handles the complete onboarding experience
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme';
import WelcomeScreen from './WelcomeScreen';
import CountrySelectionScreen from './CountrySelectionScreen';
import {
  isSmallDevice,
  getResponsivePadding,
  getScreenWidth,
} from '../../utils/responsive';

// Safe import of reanimated with fallback
let Animated: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withSpring: any;
let interpolate: any;

try {
  const Reanimated = require('react-native-reanimated');
  Animated = Reanimated.default || Reanimated;
  useAnimatedStyle = Reanimated.useAnimatedStyle;
  useSharedValue = Reanimated.useSharedValue;
  withSpring = Reanimated.withSpring;
  interpolate = Reanimated.interpolate;
} catch (e) {
  console.log('⚠️ [OnboardingScreen] Reanimated not available, using fallback');
}

// Create safe Animated.View component
const AnimatedView = Animated && Animated.View 
  ? Animated.View 
  : Animated && Animated.createAnimatedComponent 
    ? Animated.createAnimatedComponent(View)
    : View;

// Width will be updated dynamically

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

// Pagination Dot Component
interface PaginationDotProps {
  index: number;
  currentIndex: number;
  scrollX: any;
  width: number;
}

const PaginationDot: React.FC<PaginationDotProps> = ({ index, currentIndex, scrollX, width }) => {
  // Safe animated style with fallback
  const animatedStyle = useAnimatedStyle && interpolate && scrollX
    ? useAnimatedStyle(() => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const scale = interpolate(
          scrollX.value,
          inputRange,
          [0.8, 1.2, 0.8],
          'clamp'
        );
        const opacity = interpolate(
          scrollX.value,
          inputRange,
          [0.4, 1, 0.4],
          'clamp'
        );

        return {
          transform: [{ scale }],
          opacity,
        };
      })
    : {
        transform: [{ scale: index === currentIndex ? 1.2 : 0.8 }],
        opacity: index === currentIndex ? 1 : 0.4,
      };

  return (
    <AnimatedView
      style={[
        styles.paginationDot,
        index === currentIndex && styles.paginationDotActive,
        animatedStyle,
      ]}
    />
  );
};

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue ? useSharedValue(0) : { value: 0 };
  
  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const width = screenData.width;
  const isSmall = isSmallDevice();
  const padding = getResponsivePadding();
  
  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Start with country selection first (required before accessing any content)
  const screens = [
    { id: 'country', component: CountrySelectionScreen },
    { id: 'welcome', component: WelcomeScreen },
  ];

  const handleNext = () => {
    if (currentIndex < screens.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      navigation.navigate('Main' as never);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Main' as never);
  };

  const renderItem = ({ item }: { item: typeof screens[0] }) => {
    const Component = item.component;
    return <Component />;
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {screens.map((_, index) => (
          <PaginationDot
            key={index}
            index={index}
            currentIndex={currentIndex}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={screens}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        onScroll={(event) => {
          if (scrollX && scrollX.value !== undefined) {
            scrollX.value = event.nativeEvent.contentOffset.x;
          }
        }}
      />
      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  pagination: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  paginationDotActive: {
    backgroundColor: colors.primary[500],
    width: 24,
  },
});

export default OnboardingScreen;

