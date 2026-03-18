import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView, StatusBar } from 'react-native';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '../theme';
import { getResponsivePadding } from '../utils/responsive';

const { width } = Dimensions.get('window');

const AdminDashboardSkeleton = () => {
    const padding = getResponsivePadding();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background Gradient for whole screen */}
            <View style={styles.backgroundContainer}>
                <View style={styles.backgroundCircle1} />
                <View style={styles.backgroundCircle2} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Skeleton - Matches AdminDashboardScreen header */}
                <View style={styles.headerContainer}>
                    <LinearGradient
                        colors={[colors.navy[900], colors.navy[700]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
                    >
                        <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
                            <View style={styles.headerTitleContainer}>
                                <View style={{ flex: 1 }}>
                                    <SkeletonLoader width={120} height={12} borderRadius={4} style={styles.mb1} />
                                    <SkeletonLoader width={180} height={32} borderRadius={8} />
                                </View>
                                <View style={styles.languageButton}>
                                    <SkeletonLoader width={40} height={20} borderRadius={10} />
                                </View>
                            </View>
                            <View style={styles.profileButton}>
                                <SkeletonLoader width={40} height={40} borderRadius={20} />
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Stats Carousel Skeleton - Overlapping the header */}
                    <View style={styles.carouselContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: padding.horizontal, paddingBottom: 20 }}
                        >
                            {[1, 2, 3, 4].map((i) => (
                                <View key={i} style={styles.glassCard}>
                                    <View style={styles.glassCardTop}>
                                        <SkeletonLoader width={36} height={36} borderRadius={12} />
                                    </View>
                                    <SkeletonLoader width={60} height={18} borderRadius={4} style={{ marginTop: 12 }} />
                                    <SkeletonLoader width={80} height={12} borderRadius={3} style={{ marginTop: 4 }} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                <View style={[styles.bodyContent, { paddingHorizontal: padding.horizontal }]}>
                    {/* Hero Card Skeleton */}
                    <View style={styles.heroCardContainer}>
                        <View style={styles.heroCard}>
                            <View style={styles.heroHeader}>
                                <View>
                                    <SkeletonLoader width={140} height={18} borderRadius={4} style={styles.mb2} />
                                    <SkeletonLoader width={100} height={12} borderRadius={3} />
                                </View>
                                <SkeletonLoader width={40} height={32} borderRadius={8} />
                            </View>
                            <SkeletonLoader width="100%" height={12} borderRadius={6} />
                            <View style={styles.perfLegendRow}>
                                <SkeletonLoader width={80} height={12} borderRadius={4} />
                                <SkeletonLoader width={80} height={12} borderRadius={4} />
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions Grid Skeleton */}
                    <SkeletonLoader width={140} height={24} borderRadius={4} style={styles.mb4} />
                    <View style={styles.gridContainer}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.actionCard}>
                                <SkeletonLoader width={56} height={56} borderRadius={28} style={styles.mb2} />
                                <SkeletonLoader width={70} height={12} borderRadius={4} />
                            </View>
                        ))}
                    </View>

                    {/* Recent Activity Skeleton */}
                    <View style={styles.sectionHeader}>
                        <SkeletonLoader width={160} height={24} borderRadius={4} />
                        <SkeletonLoader width={50} height={16} borderRadius={4} />
                    </View>

                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.recentItem}>
                            <SkeletonLoader width={44} height={44} borderRadius={14} style={{ marginRight: 16 }} />
                            <View style={{ flex: 1 }}>
                                <SkeletonLoader width={100} height={16} borderRadius={4} style={styles.mb1} />
                                <SkeletonLoader width={120} height={12} borderRadius={3} />
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <SkeletonLoader width={60} height={16} borderRadius={4} style={styles.mb1} />
                                <SkeletonLoader width={50} height={12} borderRadius={3} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    headerContainer: {
        marginBottom: 20,
    },
    headerGradient: {
        paddingBottom: 90,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
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
    languageButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        marginLeft: 12,
    },
    profileButton: {
        padding: 4,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    carouselContainer: {
        marginTop: -40,
    },
    glassCard: {
        width: 156,
        height: 124,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 5,
    },
    glassCardTop: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    bodyContent: {
        paddingTop: 10,
    },
    heroCardContainer: {
        marginBottom: 24,
        borderRadius: 24,
        backgroundColor: colors.white,
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
    },
    heroCard: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 24,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    perfLegendRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 20,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32,
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '47%',
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: 1.1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    recentItem: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 1,
    },
    mb1: { marginBottom: 4 },
    mb2: { marginBottom: 8 },
    mb4: { marginBottom: 16 },
});

export default AdminDashboardSkeleton;
