/**
 * ULTIMATE PREMIUM ADMIN DASHBOARD
 * "Medal-Worthy" Aesthetic
 * Features: Organic Curves, Glassmorphism, Dark Mode Hero Cards, Neon Accents
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StatusBar, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { useOrderRealtime } from '../../hooks/useOrderRealtime';
import { useLoading } from '../../contexts/LoadingContext';
import { AnimatedView, AdminDashboardSkeleton, GlassStatCard } from '../../components';

import { formatPrice } from '../../utils/productUtils';
import { formatDate, formatCurrency } from '../../utils/regionalFormatting';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { RootStackParamList, OrderStatus } from '../../types';
import { colors } from '../../theme';
import {
  isTablet,
  getResponsivePadding,
} from '../../utils/responsive';

type AdminDashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminDashboard'>;

const AdminDashboardScreen = () => {
  const navigation = useNavigation<AdminDashboardScreenNavigationProp>();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { showLoading, hideLoading } = useLoading();
  const insets = useSafeAreaInsets();
  const country = (user?.country_preference || COUNTRIES.GERMANY) as Country;

  // Language switcher handler
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Responsive dimensions
  const isTabletDevice = isTablet();
  const padding = getResponsivePadding();

  // Set up real-time updates
  useOrderRealtime(user?.id || '');

  // Fetch Data
  const {
    data: allOrders = [],
    isLoading: loadingOrders,
    error: ordersError,
    refetch: refetchOrders,
    isRefetching: refetchingOrders
  } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => orderService.getAllOrders(),
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes — avoid refetch on every focus
  });

  const {
    data: products = [],
    isLoading: loadingProducts,
    error: productsError,
    refetch: refetchProducts,
    isRefetching: refetchingProducts
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts({ active: true }),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes — products change less often
  });

  const onRefresh = useCallback(() => {
    refetchOrders();
    refetchProducts();
  }, [refetchOrders, refetchProducts]);

  const isRefetching = refetchingOrders || refetchingProducts;

  // Calculate statistics
  const statistics = useMemo(() => {
    // If we have errors, statistics might be misleading, but we provide fallbacks
    const ordersList = Array.isArray(allOrders) ? allOrders : [];
    const productsList = Array.isArray(products) ? products : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = ordersList.filter((order) => {
      if (!order?.created_at) return false;
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    const todayGermany = todayOrders.filter(o => o.country === 'germany').length;
    const todayDenmark = todayOrders.filter(o => o.country === 'denmark').length;

    const totalRevenue = ordersList
      .filter((order) => order && order.status !== 'canceled')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0);

    const pendingOrders = ordersList.filter((order) => order && ['pending', 'confirmed'].includes(order.status)).length;

    return {
      totalOrders: ordersList.length,
      todayOrders: todayOrders.length,
      todayGermany,
      todayDenmark,
      totalRevenue,
      pendingOrders,
      totalProducts: productsList.length,
      hasErrors: !!(ordersError || productsError)
    };
  }, [allOrders, products, ordersError, productsError]);

  // Get recent orders
  const recentOrders = useMemo(() => {
    return allOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [allOrders]);

  const handleOrderPress = useCallback((orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  }, [navigation]);

  const handleNavigation = useCallback((screen: string) => {
    showLoading();
    // Small delay to let the UI update and show spinner
    setTimeout(() => {
      navigation.navigate(screen as any);
      hideLoading();
    }, 500);
  }, [navigation, showLoading, hideLoading]);

  if (loadingOrders || loadingProducts) {
    return <AdminDashboardSkeleton />;
  }

  // Guard for null user during logout transition
  if (!user) {
    return <AdminDashboardSkeleton />;
  }

  const hasDataError = !!(ordersError || productsError);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />


      {/* Background Gradient for whole screen */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: 120, // Increased for better scrolling at bottom
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.white} />}
      >

        {/* HERO HEADER - Massive Curve */}
        <View style={styles.headerContainer}>
          <ExpoLinearGradient
            colors={[colors.navy[900], colors.navy[700]]} // Deep Premium Navy
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
          >
            <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
              <View style={styles.headerTitleContainer}>
                <View style={{ flex: 1, flexShrink: 1, marginRight: 12 }}>
                  <Text
                    style={styles.headerSubtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t('admin.dashboard.title')}
                  </Text>
                  <Text
                    style={styles.headerTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit={true}
                  >
                    {t('admin.dashboard.overview')}
                  </Text>
                </View>
                {/* Language Switcher Button */}
                <TouchableOpacity
                  onPress={toggleLanguage}
                  style={styles.languageButton}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="translate"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.languageButtonText}>
                    {i18n.language === 'en' ? 'TA' : 'EN'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                  // Profile is a tab inside Main; route through the parent stack if available
                  const nav = navigation as any;
                  const parent = nav?.getParent?.();
                  if (parent?.navigate) {
                    parent.navigate('Main', { screen: 'Profile' });
                  } else if (nav?.navigate) {
                    nav.navigate('Profile');
                  }
                }}
              >
                <ImageUserAvatar />
              </TouchableOpacity>
            </View>
          </ExpoLinearGradient>

          {/* Error Banner */}
          {hasDataError && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Icon name="alert-circle" size={18} color={colors.white} />
              <Text style={styles.errorBannerText}>{t('admin.dashboard.failedToSync')}</Text>
              <Icon name="refresh" size={16} color={colors.white} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}

          {/* The Floating Stats Carousel */}
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: padding.horizontal, paddingBottom: 20 }}
            >
              <GlassStatCard
                label={t('admin.dashboard.totalRevenue')}
                value={formatCurrency(statistics.totalRevenue, country)}
                icon="currency-usd"
                color="#4ADE80" // Green
              />
              <GlassStatCard
                label={t('admin.dashboard.activeOrders')}
                value={statistics.pendingOrders.toString()}
                icon="clock-outline"
                color="#FBBF24" // Amber
              />
              <GlassStatCard
                label={t('admin.dashboard.totalOrders')}
                value={statistics.totalOrders.toString()}
                icon="package-variant"
                color="#60A5FA" // Blue
              />
              <GlassStatCard
                label={t('admin.dashboard.products')}
                value={statistics.totalProducts.toString()}
                icon="tag-outline"
                color="#A78BFA" // Purple
              />
            </ScrollView>
          </View>
        </View>

        <View style={[styles.bodyContent, { paddingHorizontal: padding.horizontal }]}>

          {/* Daily Performance Card */}
          <AnimatedView animation="fade" delay={200} style={styles.heroCardContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleNavigation('AdminTopProducts')}
              style={styles.heroCard}
            >
              <View style={styles.heroHeader}>
                <View>
                  <Text style={[styles.heroTitle, { color: colors.neutral[800] }]} numberOfLines={1} adjustsFontSizeToFit={true}>{t('admin.dashboard.todaysBookings')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={styles.heroSubtitle}>{t('admin.dashboard.tapForTopProducts')}</Text>
                    <Icon name="chevron-right" size={14} color={colors.neutral[400]} />
                  </View>
                </View>
                <Text style={[styles.heroBigValue, { color: colors.neutral[900] }]}>{statistics.todayOrders}</Text>
              </View>

              {/* Performance Bars */}
              <View style={styles.performanceBars}>
                <View style={styles.track}>
                  {statistics.todayOrders > 0 && statistics.todayGermany > 0 && (
                    <View style={[
                      styles.fill,
                      {
                        width: `${statistics.todayOrders > 0 ? (statistics.todayGermany / statistics.todayOrders) * 100 : 0}%`,
                        backgroundColor: colors.navy[900]
                      }
                    ]} />
                  )}
                  {statistics.todayOrders > 0 && statistics.todayDenmark > 0 && (
                    <View style={[
                      styles.fill,
                      {
                        width: `${statistics.todayOrders > 0 ? (statistics.todayDenmark / statistics.todayOrders) * 100 : 0}%`,
                        backgroundColor: colors.error[500]
                      }
                    ]} />
                  )}
                </View>

                <View style={styles.perfLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.navy[900] }]} />
                    <Text style={[styles.legendText, { color: colors.neutral[700] }]}>{t('admin.dashboard.germany')} ({statistics.todayGermany})</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.error[500] }]} />
                    <Text style={[styles.legendText, { color: colors.neutral[700] }]}>{t('admin.dashboard.denmark')} ({statistics.todayDenmark})</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </AnimatedView>

          {/* Quick Actions Grid */}
          <Text style={styles.sectionTitle}>{t('admin.dashboard.quickActions')}</Text>
          <View style={styles.gridContainer}>
            <ActionCard
              title={t('admin.dashboard.products')}
              icon="store"
              color={colors.primary[500]}
              onPress={() => handleNavigation('Products')}
            />
            <ActionCard
              title={t('navigation.orders')}
              icon="package-variant-closed"
              color={colors.warning[500]}
              onPress={() => handleNavigation('Orders')}
            />
            <ActionCard
              title={t('admin.dashboard.delivery')}
              icon="truck-delivery"
              color={colors.info[500]}
              onPress={() => handleNavigation('Delivery')}
            />
            <ActionCard
              title={t('admin.dashboard.settings')}
              icon="cog"
              color={colors.neutral[500]}
              onPress={() => handleNavigation('Settings')}
            />
          </View>

          {/* Recent Orders */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.dashboard.recentActivity')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders' as any)}>
              <Text style={styles.seeAllParams}>{t('admin.dashboard.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.map((item: any, index: number) => (
            <AnimatedView key={item.id} animation="fade" delay={400 + (index * 50)}>
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => handleOrderPress(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.recentIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Icon name={getStatusIcon(item.status)} size={20} color={getStatusColor(item.status)} />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentId}>#{item.id.slice(0, 8)}</Text>
                  <Text style={styles.recentDate}>{formatDate(item.created_at, country)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recentAmount}>{formatCurrency(item.total_amount, item.country === 'germany' ? COUNTRIES.GERMANY : COUNTRIES.DENMARK)}</Text>
                  <Text style={[styles.recentStatus, { color: getStatusColor(item.status) }]}>{t(`orders.${item.status.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase())}`)}</Text>
                </View>
              </TouchableOpacity>
            </AnimatedView>
          ))}

          {recentOrders.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('admin.dashboard.noRecentActivity')}</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
};

// --- Subcomponents ---

const ImageUserAvatar = () => (
  <View style={styles.avatarContainer}>
    <Icon name="account" size={24} color={colors.navy[900]} />
  </View>
);

const ActionCard = ({ title, icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={[styles.actionIconCircle, { backgroundColor: color + '15' }]}>
      <Icon name={icon} size={28} color={color} />
    </View>
    <Text style={styles.actionCardTitle} numberOfLines={1} adjustsFontSizeToFit={true} ellipsizeMode="tail">{title}</Text>
  </TouchableOpacity>
);

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return colors.warning[500];
    case 'confirmed': return colors.info[500];
    case 'out_for_delivery': return colors.primary[500];
    case 'delivered': return colors.success[500];
    case 'canceled': return colors.error[500];
    default: return colors.neutral[500];
  }
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'clock-outline';
    case 'confirmed': return 'check-circle-outline'; // Changed for variety
    case 'out_for_delivery': return 'truck-fast';
    case 'delivered': return 'check-decagram';
    case 'canceled': return 'close-circle';
    default: return 'help-circle';
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Very light slate
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.navy[100],
    opacity: 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: colors.primary[50],
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },

  // HEADER
  headerContainer: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingBottom: 90, // Increased space for the floating carousel overlap

    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 20, // Increased
    fontWeight: '700',
    color: colors.primary[200],
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 44, // Increased from 40
    fontWeight: '800',
    color: colors.white,
    marginTop: 4,
    paddingVertical: 2,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12, // Increased
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 12,
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 20, // Increased from 18
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileButton: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CAROUSEL
  carouselContainer: {
    marginTop: -40, // Adjusted overlap
  },
  glassCard: {
    width: 156, // Increased slightly
    height: 124, // Increased height for Tamil text
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    justifyContent: 'space-between',
  },
  glassCardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  glassIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassValue: {
    fontSize: 18,
    lineHeight: 28, // Increased from 26
    fontWeight: '800',
    color: colors.navy[900],
    paddingTop: 4,
  },
  glassLabel: {
    fontSize: 12,
    lineHeight: 20, // Increased from 18
    fontWeight: '600',
    color: colors.neutral[500],
    paddingBottom: 2, // Slight padding
  },

  // BODY
  bodyContent: {
    paddingTop: 10,
  },

  // HERO CARD
  heroCardContainer: {
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: colors.white,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 }, // Reduced offset
    shadowOpacity: 0.06, // Softer opacity
    shadowRadius: 16, // Reduced radius
    elevation: 3,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Ensure title and value are spaced out
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconStub: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 28, // Increased from 26
    fontWeight: '700',
    color: colors.neutral[800],
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 20, // Increased from 18
    color: colors.neutral[500],
  },
  heroBigValue: {
    fontSize: 32,
    lineHeight: 44, // Increased
    fontWeight: '800',
    color: colors.navy[900],
  },
  performanceBars: {
    gap: 0,
  },
  perfRow: {},
  perfLabelRow: { // Kept for backward compatibility if needed, though mostly replaced
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  perfLabel: {
    fontSize: 13,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: colors.neutral[500],
  },
  perfValue: {
    fontSize: 14,
    lineHeight: 24, // Increased
    fontWeight: '700',
    color: colors.neutral[900],
  },
  track: {
    height: 12, // Slightly thicker for white theme
    backgroundColor: colors.neutral[100], // Visible on white
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row', // Ensure children sit side-by-side
  },
  fill: {
    height: '100%',
    // borderRadius treated individually in code or can be handled here if unique
  },
  perfLegendRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 20, // Increased from 18
    fontWeight: '600',
  },

  // GRID
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // Increased gap
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '47%', // Slightly less than 48% to account for gap
    backgroundColor: colors.white,
    borderRadius: 24, // Increased radius
    padding: 20, // Increased padding
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1.1, // More square-ish
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 14,
    lineHeight: 22, // Increased from 20
    fontWeight: '700',
    color: colors.navy[800],
    textAlign: 'center', // Center align text
    paddingHorizontal: 4,
  },

  // SECTIONS
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 30, // Increased from 28
    fontWeight: '800',
    color: colors.navy[900],
    marginBottom: 16,
  },
  seeAllParams: {
    fontSize: 14,
    lineHeight: 24, // Increased
    fontWeight: '700',
    color: colors.primary[600],
  },

  // RECENT LIST
  recentItem: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18, // Increased padding
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentInfo: {
    flex: 1,
  },
  recentId: {
    fontSize: 15,
    lineHeight: 24, // Increased
    fontWeight: '700',
    color: colors.navy[900],
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 12,
    lineHeight: 20, // Increased
    color: colors.neutral[500],
  },
  recentAmount: {
    fontSize: 15,
    lineHeight: 24, // Increased
    fontWeight: '700',
    color: colors.navy[900],
    marginBottom: 4,
  },
  recentStatus: {
    fontSize: 11,
    lineHeight: 18, // Increased
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
    shadowColor: colors.error[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  errorBannerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.neutral[400],
  },
});

export default AdminDashboardScreen;
