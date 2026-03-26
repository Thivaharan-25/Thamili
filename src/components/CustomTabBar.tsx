import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// ─── Single Tab Item ────────────────────────────────────────────────────────

interface TabItemProps {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const TabBarItem = ({ focused, onPress, onLongPress, icon, label, badge }: TabItemProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pillWidthAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pillWidthAnim, {
        toValue: focused ? 1 : 0,
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }),
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  // Pill background interpolation
  const pillWidth = pillWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [46, 100],
  });

  const pillBg = pillWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.primary[50]],
  });

  // Label height collapses to 0 when unfocused so icons stay centered
  const labelHeight = pillWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            width: pillWidth,
            backgroundColor: pillBg,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ color: string; size: number }>, {
                  color: focused ? colors.primary[500] : colors.navy[300],
                  size: 22,
                })
              : null}
            {/* Badge */}
            {badge && badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Label — fades in and expands when focused */}
          <Animated.View style={{ height: labelHeight, overflow: 'hidden' }}>
            <Animated.Text
              numberOfLines={1}
              style={[styles.label, { opacity: labelOpacity }]}
            >
              {label}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Main Tab Bar ────────────────────────────────────────────────────────────

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  // Reserve enough height so React Navigation pads screen content correctly.
  // 72 = dock visual height, 12 = float gap above bottom, insets.bottom = safe area
  const containerHeight = 72 + 12 + insets.bottom;

  return (
    <View
      style={[styles.outerContainer, { height: containerHeight, paddingBottom: insets.bottom }]}
      pointerEvents="box-none"
    >
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;

          const { options } = descriptor;
          const isFocused = state.index === index;

          const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;

          let icon: React.ReactNode = null;
          if (typeof options.tabBarIcon === 'function') {
            try {
              icon = options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? colors.primary[500] : colors.navy[300],
                size: 22,
              });
            } catch (err) {
              if (__DEV__) console.warn('[CustomTabBar] icon render failed:', err);
            }
          }

          const badge = options.tabBarBadge as number | undefined;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabBarItem
              key={route.key}
              focused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              icon={icon}
              label={label}
              badge={badge}
            />
          );
        })}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12, // default gap; overridden by insets.bottom in component
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
    // Shadow
    shadowColor: colors.navy[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
    // Subtle top border
    borderWidth: Platform.OS === 'android' ? 0 : StyleSheet.hairlineWidth,
    borderColor: colors.neutral[100],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 40,
    overflow: 'hidden',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary[600],
    marginTop: 3,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error[500],
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 7,
    fontWeight: '800',
  },
});

export default CustomTabBar;
