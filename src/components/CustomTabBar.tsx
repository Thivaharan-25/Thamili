import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface TabItemProps {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const TabBarItem = ({ focused, onPress, onLongPress, icon, label, badge }: TabItemProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[
        styles.tabItem,
        { flex: focused ? 1.5 : 1 }
      ]}
    >
      <View style={[styles.iconWrapper, !focused && styles.iconUnfocused]}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ color: string; size: number }>, {
            color: focused ? (colors.primary[500] || '#3AB5D1') : (colors.navy[300] || '#667587'),
            size: 24,
          })
          : null}
        {badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      {focused ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.systemBackground, { height: 75 + insets.bottom }]} />

      <View
        style={[
          styles.dockContainer,
          {
            height: 75 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
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
                color: isFocused ? '#3AB5D1' : '#667587',
                size: 24,
              });
            } catch (error) {
              console.warn('[CustomTabBar] tabBarIcon render failed:', error);
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

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  systemBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dockContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    width: '100%',
    minHeight: 75,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tabItem: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnfocused: {
    opacity: 0.7,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[500] || '#3AB5D1',
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});

export default CustomTabBar;
