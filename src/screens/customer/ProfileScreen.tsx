/**
 * Modern Profile Screen with "Super App" Dashboard Design
 * Features: Premium Gradient Header, Quick Stats, and Comprehensive Menu Links
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, StyleSheet, Platform, Switch, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useOrders } from '../../hooks/useOrders';
import { useDeliveries } from '../../hooks/useDeliveries';
import { CountrySelector, AnimatedView, Badge, useToast, LogoutModal, ConfirmationModal, SkeletonCard } from '../../components';
import SkeletonLoader from '../../components/SkeletonLoader';
import { formatPhoneNumber } from '../../utils/regionalFormatting';
import { COUNTRIES } from '../../constants';
import { ASSETS } from '../../constants/assets';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import { getResponsivePadding } from '../../utils/responsive';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

// Quick Stats Component
const QuickStats = React.memo(({ total, pending, type = 'orders' }: { total: number; pending: number; type?: 'orders' | 'deliveries' }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
          {type === 'deliveries' ? t('profile.deliveries') : t('navigation.orders')}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{pending}</Text>
        <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
          {t('orders.pending')}
        </Text>
      </View>
    </View>
  );
});

// Reusable Menu Option Component
interface MenuOptionProps {
  icon: keyof typeof Icon.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
  loading?: boolean;
}

const MenuOption: React.FC<MenuOptionProps> = React.memo(({
  icon,
  title,
  subtitle,
  onPress,
  color = colors.primary[600],
  isDestructive,
  rightElement,
  loading
}) => (
  <TouchableOpacity
    style={styles.menuOption}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconContainer, { backgroundColor: isDestructive ? colors.error[50] : colors.primary[50] }]}>
      <Icon name={icon} size={22} color={isDestructive ? colors.error[500] : color} />
    </View>
    <View style={styles.menuContent}>
      <Text
        style={[styles.menuTitle, isDestructive && { color: colors.error[600] }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={styles.menuSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </View>
    {loading ? (
      <View style={{ marginRight: 4 }}>
        <Icon name="loading" size={20} color={colors.neutral[400]} />
      </View>
    ) : rightElement || (
      <Icon name="chevron-right" size={20} color={colors.neutral[300]} />
    )}
  </TouchableOpacity>
));

const SectionHeader = React.memo(({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
));

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { t, i18n } = useTranslation();
  const { user, logout, updateCountryPreference, deleteAccount, isLoading: isAuthLoading } = useAuthStore();

  const { setSelectedCountry } = useCartStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const padding = getResponsivePadding();

  // Fetch real order data
  const { data: orders = [], isLoading: isOrdersLoading } = useOrders(user?.id || '', { status: 'all' });
  const { data: deliveries = [], isLoading: isDeliveriesLoading } = useDeliveries(user?.role === 'delivery_partner' ? user?.id || '' : '');

  const isDeliveryPartner = user?.role === 'delivery_partner';

  const { totalStats, pendingStats } = useMemo(() => {
    const total = isDeliveryPartner ? deliveries.length : orders.length;
    const pending = isDeliveryPartner
      ? deliveries.filter(d => d.status !== 'delivered' && d.status !== 'canceled' && d.status !== 'failed').length
      : orders.filter(o =>
        o.status === 'pending' ||
        o.status === 'confirmed' ||
        o.status === 'out_for_delivery'
      ).length;
    return { totalStats: total, pendingStats: pending };
  }, [isDeliveryPartner, deliveries, orders]);

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // Language switcher handler
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
  };


  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    const result = await deleteAccount();
    if (!result.success) {
      if (Platform.OS === 'web') {
        alert(result.error || 'Failed to delete account');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete account');
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleCountryChange = async (country: Country) => {
    if (user) {
      try {
        await updateCountryPreference(country);
        await setSelectedCountry(country);
        showToast({
          message: t('profile.countryUpdated', { country: country === COUNTRIES.GERMANY ? t('profile.germany') : t('profile.denmark') }),
          type: 'success',
          duration: 2000,
        });
      } catch (error: any) {
        showToast({
          message: error.message || t('profile.failedToUpdateCountry'),
          type: 'error',
          duration: 3000,
        });
      }
    }
  };

  // Defensive guard for logout transition
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.navy[900], colors.navy[700]]}
          style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}
        />
        <Text style={[styles.loadingText, { color: colors.white }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Show profile skeleton while initial data loads
  const isInitialLoad = (isOrdersLoading && orders.length === 0) || (isDeliveryPartner && isDeliveriesLoading && deliveries.length === 0);
  if (isInitialLoad) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[colors.navy[900], colors.navy[700]]}
          style={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 20 }}
        >
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <SkeletonLoader width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
            <SkeletonLoader width={140} height={18} borderRadius={8} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={180} height={14} borderRadius={7} />
          </View>
        </LinearGradient>
        <View style={{ paddingHorizontal: padding.horizontal, marginTop: -20 }}>
          <SkeletonCard type="profile" count={1} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Premium Header */}
        <AnimatedView animation="fade" duration={350}>
          <LinearGradient
            colors={[colors.navy[900], colors.navy[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <Text style={styles.headerLabel}>{t('profile.title')}</Text>
                {/* Language Switcher Button */}
                <TouchableOpacity
                  onPress={toggleLanguage}
                  style={styles.languageButton}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="translate"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.languageButtonText}>
                    {i18n.language === 'en' ? 'TA' : 'EN'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileRow}>
                <View style={styles.userInfo}>
                  <Text style={styles.welcomeText}>{t('home.welcomeBack')},</Text>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name || user.email?.split('@')[0]}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.roleContainer}>
                    <Badge variant={user.role === 'admin' ? 'error' : user.role === 'delivery_partner' ? 'warning' : 'secondary'} size="sm">
                      {user.role === 'admin'
                        ? t('profile.admin')
                        : user.role === 'delivery_partner'
                          ? t('profile.deliveryPartner')
                          : t('profile.customer')}
                    </Badge>
                  </View>
                </View>

                <View style={styles.avatarContainer}>
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.avatar} resizeMode="cover" />
                  ) : user.name || user.email ? (
                    <View style={styles.avatarPlaceholder}>
                      <Icon name="account" size={40} color={colors.primary[600]} />
                    </View>
                  ) : (
                    <Image source={ASSETS.logo} style={styles.avatar} resizeMode="contain" />
                  )}
                  <View style={styles.activeBadge} />
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Stats Floating Card - Only show for Customers */}
          {user?.role === 'customer' && (
            <View style={styles.statsWrapper}>
              <QuickStats
                total={totalStats}
                pending={pendingStats}
                type="orders"
              />
            </View>
          )}
        </AnimatedView>

        {/* Menu Options */}
        <View style={styles.menuContainer}>

          {/* My Account Section - Hide for Admins */}
          {user.role !== 'admin' && (
            <AnimatedView animation="slide" delay={100} enterFrom="bottom" duration={300}>
              <SectionHeader title={t('profile.account')} />
              <View style={styles.menuCard}>
                <MenuOption
                  icon="map-marker-radius-outline"
                  title={t('profile.addresses')}
                  subtitle={t('profile.manageDeliveryLocations')}
                  onPress={() => navigation.navigate('Addresses')}
                />

              </View>
            </AnimatedView>
          )}


          {/* Settings Section */}
          <AnimatedView animation="slide" delay={200} enterFrom="bottom" duration={300}>
            <SectionHeader title={t('settings.title')} />
            <View style={styles.menuCard}>
              <MenuOption
                icon="account-edit-outline"
                title={t('profile.editProfile')}
                onPress={() => navigation.navigate('EditProfile')}
              />
              <View style={styles.divider} />
              <MenuOption
                icon="lock-outline"
                title={t('auth.changePassword') || 'Change Password'}
                onPress={() => navigation.navigate('ChangePassword')}
              />
              {/* Manage Delivery Man - Admin Only */}
              {user.role === 'admin' && (
                <>
                  <View style={styles.divider} />
                  <MenuOption
                    icon="account-group-outline"
                    title={t('admin.settings.manageDeliveryMan', 'Manage Delivery Man')}
                    subtitle={t('admin.settings.configureDelivery', 'Configure delivery options')}
                    onPress={() => navigation.navigate('ManageDeliveryMan')}
                  />
                </>
              )}
              <View style={styles.divider} />
              {/* Custom Country Selector Option */}
              <View style={styles.countryOption}>
                <View style={styles.menuIconContainer}>
                  <Icon name="earth" size={22} color={colors.primary[600]} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>
                    {t('Country') || 'Region'} - {user.country_preference === COUNTRIES.GERMANY ? t('profile.germany') || 'Germany' : t('profile.denmark') || 'Denmark'}
                  </Text>
                </View>
                <CountrySelector
                  selectedCountry={(user.country_preference === COUNTRIES.DENMARK ? COUNTRIES.DENMARK : COUNTRIES.GERMANY) as Country}
                  onSelectCountry={handleCountryChange}
                  compact
                  transparent
                />
              </View>
            </View>
          </AnimatedView>




          {/* Danger Zone Section - Hide for Admins */}
          {user.role !== 'admin' && (
            <AnimatedView animation="slide" delay={300} enterFrom="bottom" duration={300}>
              <SectionHeader title={t('settings.dangerZone') || 'Danger Zone'} />
              <View style={styles.menuCard}>
                <MenuOption
                  icon="account-remove-outline"
                  title={t('settings.deleteAccount') || 'Delete Account'}
                  subtitle="Permanently remove your account and data"
                  isDestructive
                  onPress={handleDeleteAccount}
                  loading={isAuthLoading}
                />
              </View>
            </AnimatedView>
          )}

          {/* Logout Section */}
          <AnimatedView animation="slide" delay={400} enterFrom="bottom" duration={300}>
            <View style={[styles.menuCard, { marginTop: 20, marginBottom: 80 }]}>
              <MenuOption
                icon="logout"
                title={t('auth.logout') || 'Logout'}
                isDestructive
                onPress={handleLogout}
              />
            </View>
          </AnimatedView>
        </View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogout={confirmLogout}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
        title={t('settings.deleteAccountTitle') || 'Delete Account'}
        message={t('settings.deleteAccountMessage') || 'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be cleared.'}
        confirmLabel={t('common.delete') || 'Delete'}
        cancelLabel={t('common.cancel') || 'Cancel'}
        icon="account-remove-outline"
        confirmColor="#FF3B30"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[600],
    fontWeight: '500',
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerGradient: {
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success[500],
    borderWidth: 2,
    borderColor: colors.primary[800],
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
  },
  // Stats
  statsWrapper: {
    marginTop: -35,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.neutral[100],
  },
  // Menu
  menuContainer: {
    padding: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[400],
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    flexShrink: 1,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[50],
    marginLeft: 72,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 8,
  },
});

export default ProfileScreen;
