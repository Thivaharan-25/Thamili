
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { orderService } from '../../services/orderService';
import { colors } from '../../theme';
import { AppHeader, AnimatedView, Badge, EmptyState } from '../../components';
import { getResponsivePadding, getResponsiveFontSize } from '../../utils/responsive';

type AdminTopProductsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminTopProducts'>;

type Period = 'today' | 'week' | 'month';

const AdminTopProductsScreen = () => {
    const navigation = useNavigation<AdminTopProductsScreenNavigationProp>();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const padding = getResponsivePadding();

    const [period, setPeriod] = useState<Period>('week');
    const [activeTab, setActiveTab] = useState<'both' | 'germany' | 'denmark'>('both');

    const { data: stats = [], isLoading, refetch } = useQuery({
        queryKey: ['topProducts', period],
        queryFn: () => orderService.getTopProducts(period),
    });

    const topData = stats[0] || { germany: [], denmark: [] };

    const renderProductItem = (item: any, index: number) => (
        <View key={item.product_id} style={styles.productItem}>
            <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
            </View>

            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImage} />
            ) : (
                <View style={styles.productPlaceholder}>
                    <Icon name="package-variant" size={24} color={colors.neutral[300]} />
                </View>
            )}

            <View style={styles.productInfo}>
                <Text
                    style={styles.productName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {item.name}
                </Text>
                <Text style={styles.orderCount}>{t('admin.topProducts.ordersCount', { count: Math.round(item.count) })}</Text>
            </View>


        </View>
    );

    const renderCountrySection = (countryName: string, data: any[]) => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.flagDot, { backgroundColor: countryName === 'germany' ? colors.navy[900] : colors.error[500] }]} />
                    <Text style={styles.sectionTitle}>{t('admin.dashboard.' + countryName).toUpperCase()}</Text>
                </View>
                <Badge text={t('admin.topProducts.top5')} color={countryName === 'germany' ? colors.navy[900] : colors.error[500]} />
            </View>

            <View style={styles.card}>
                {data.length > 0 ? (
                    data.map((item, index) => renderProductItem(item, index))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>{t('admin.topProducts.noOrders')}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title={t('admin.topProducts.title')} showBack />

            <View style={styles.filterContainer}>
                <View style={styles.periodSwitcher}>
                    {(['today', 'week', 'month'] as Period[]).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.periodButton, period === p && styles.activePeriodButton]}
                            onPress={() => setPeriod(p)}
                        >
                            <Text style={[styles.periodButtonText, period === p && styles.activePeriodButtonText]}>
                                {t('admin.topProducts.periods.' + p)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary[500]} />
                        <Text style={styles.loadingText}>{t('admin.topProducts.analyzing')}</Text>
                    </View>
                ) : (
                    <AnimatedView animation="fade">
                        {(activeTab === 'both' || activeTab === 'germany') && renderCountrySection('germany', topData.germany)}
                        {(activeTab === 'both' || activeTab === 'denmark') && renderCountrySection('denmark', topData.denmark)}
                    </AnimatedView>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    filterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    periodSwitcher: {
        flexDirection: 'row',
        backgroundColor: colors.neutral[100],
        borderRadius: 12,
        padding: 4,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activePeriodButton: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral[500],
    },
    activePeriodButtonText: {
        color: colors.primary[600],
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flagDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.neutral[500],
        letterSpacing: 1.2,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[50],
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.neutral[600],
    },
    productImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 16,
        backgroundColor: colors.neutral[50],
    },
    productPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 16,
        backgroundColor: colors.neutral[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.navy[900],
        marginBottom: 2,
    },
    orderCount: {
        fontSize: 13,
        color: colors.neutral[500],
        fontWeight: '500',
    },
    loadingContainer: {
        padding: 100,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: colors.neutral[400],
        fontSize: 14,
    },
    emptyCard: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.neutral[400],
        fontSize: 14,
    },
});

export default AdminTopProductsScreen;
