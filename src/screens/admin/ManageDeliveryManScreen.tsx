import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { colors } from '../../theme';
import { User } from '../../types';
import {
    AnimatedView,
    EmptyState,
    ErrorMessage,
    SkeletonCard,
    RemoveItemModal,
    SuccessCelebration
} from '../../components';
import { getResponsivePadding, isTablet } from '../../utils/responsive';

const ManageDeliveryManScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const padding = getResponsivePadding();
    const { deleteDeliveryPartner } = useAuthStore();

    const [partners, setPartners] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<User | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const loadPartners = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await userService.getDeliveryPartners();
            setPartners(data);
        } catch (err: any) {
            setError(err.message || t('admin.managePartners.failedToLoad'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadPartners();
        }, [loadPartners])
    );

    const handleAdd = () => {
        navigation.navigate('AddDeliveryMan');
    };

    const handleEdit = (partner: User) => {
        navigation.navigate('AddDeliveryMan', { deliveryMan: partner });
    };

    const handleDelete = (partner: User) => {
        setPartnerToDelete(partner);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!partnerToDelete) return;

        try {
            setIsLoading(true);
            const result = await deleteDeliveryPartner(partnerToDelete.id);
            if (result.success) {
                setDeleteModalVisible(false);
                // Immediately remove from local list for instant feedback
                setPartners(prev => prev.filter(p => p.id !== partnerToDelete.id));
                setPartnerToDelete(null);

                // Still reload to ensure sync
                loadPartners();
                setShowSuccess(true);
            } else {
                Alert.alert(t('common.error'), result.error || t('admin.managePartners.failedToDelete'));
            }
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('common.errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: User; index: number }) => (
        <AnimatedView
            animation="fade"
            delay={index * 50}
            style={styles.cardContainer}
        >
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <Icon name="truck-delivery" size={24} color={colors.primary[600]} />
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.name}>{item.name || item.username || t('admin.managePartners.unknown')}</Text>
                        <View style={styles.detailRow}>
                            <Icon name="phone" size={14} color={colors.neutral[500]} />
                            <Text style={styles.detailText}>{item.phone || t('admin.managePartners.noPhone')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Icon name="map-marker" size={14} color={colors.neutral[500]} />
                            <Text style={styles.detailText}>
                                {item.country_preference
                                    ? item.country_preference.charAt(0).toUpperCase() + item.country_preference.slice(1)
                                    : t('admin.managePartners.noCountry')}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(item)}
                    >
                        <Icon name="pencil" size={20} color={colors.primary[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item)}
                    >
                        <Icon name="trash-can-outline" size={20} color={colors.error[500]} />
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={styles.headerContainer}>
                <ExpoLinearGradient
                    colors={[colors.navy[900], colors.navy[700]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
                >
                    <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Icon name="arrow-left" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('admin.managePartners.title')}</Text>
                        <TouchableOpacity
                            onPress={handleAdd}
                            style={styles.addButton}
                        >
                            <Icon name="plus" size={24} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </ExpoLinearGradient>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {isLoading && partners.length === 0 ? (
                    <View style={{ padding: padding.horizontal }}>
                        <SkeletonCard count={3} />
                    </View>
                ) : error ? (
                    <ErrorMessage
                        message={error}
                        onRetry={loadPartners}
                    />
                ) : (
                    <FlatList
                        data={partners}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{
                            padding: padding.horizontal,
                            paddingBottom: 100
                        }}
                        ListEmptyComponent={
                            <EmptyState
                                icon="account-group"
                                title={t('admin.managePartners.noPartners')}
                                message={t('admin.managePartners.addFirst')}
                                actionLabel={t('admin.managePartners.addPartner')}
                                onAction={handleAdd}
                            />
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={loadPartners}
                                colors={[colors.primary[500]]}
                                tintColor={colors.primary[500]}
                            />
                        }
                    />
                )}
            </View>

            <RemoveItemModal
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={confirmDelete}
                title={t('admin.managePartners.deleteTitle')}
                message={t('admin.managePartners.deleteConfirm', {
                    name: partnerToDelete?.name || partnerToDelete?.username || t('admin.managePartners.unknown')
                })}
            />

            <SuccessCelebration
                visible={showSuccess}
                message={t('admin.managePartners.deletedSuccess')}
                onComplete={() => setShowSuccess(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        marginBottom: 0,
    },
    headerGradient: {
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    addButton: {
        padding: 8,
        marginRight: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    content: {
        flex: 1,
        marginTop: 20,
    },
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral[900],
        marginBottom: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    detailText: {
        fontSize: 13,
        color: colors.neutral[500],
        marginLeft: 6,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    deleteButton: {
        marginLeft: 8,
    },
});

export default ManageDeliveryManScreen;
