import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import { ASSETS } from '../constants/assets';
import CartBadge from './CartBadge';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showLogo?: boolean;
  showCart?: boolean;
  rightAction?: React.ReactNode;
  onPressBack?: () => void;
  children?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  showMenu = false,
  showLogo = true,
  showCart = true,
  rightAction,
  onPressBack,
  children,
}) => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onPressBack) {
      onPressBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleMenu = () => {
    // Navigate to settings or show menu
    navigation.navigate('Settings' as never);
  };

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.glassOverlay}>
          <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}>
            <View style={styles.leftSection}>
              {showBack && (
                <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
                  <Icon name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {showMenu && (
                <TouchableOpacity onPress={handleMenu} style={styles.iconButton}>
                  <Icon name="menu" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {!showBack && !showMenu && showLogo && (
                <Image
                  source={ASSETS.logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.rightSection}>
              {rightAction || (showCart && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Cart' as never)}
                  style={styles.iconButton}
                >
                  <View style={{ position: 'relative' }}>
                    <Icon name="cart" size={24} color="#FFFFFF" />
                    <CartBadge />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradient: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.borderDark,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  glassOverlay: {
    backgroundColor: colors.glass.backgroundDark,
    // @ts-ignore - backdropFilter is a web-only property
    backdropFilter: 'blur(10px)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default AppHeader;

