import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, createAnimatedComponent } from '../utils/reanimatedWrapper';
import { colors } from '../theme';
import { DeliveryStatus } from '../services/deliveryService';

const AnimatedView = createAnimatedComponent(View);

interface DeliveryStatusModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    status: DeliveryStatus;
    orderId?: string;
}

const { width } = Dimensions.get('window');

const DeliveryStatusModal = ({
    visible,
    onClose,
    onConfirm,
    status,
    orderId,
}: DeliveryStatusModalProps) => {
    // Shared values must be initialized conditionally or outside if possible, 
    // but hooks can't be conditional.
    // However, if visible is false, we return null later. 
    // Hooks must be called unconditionally.
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);
    const { t } = useTranslation();

    React.useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0, { damping: 15 });
        } else {
            opacity.value = 0;
            translateY.value = 50;
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    if (!visible) return null;

    // Determine content based on status
    const isStartDelivery = status === 'in_transit';
    const isDelivered = status === 'delivered';
    const isCanceled = status === 'canceled';

    let title = t('delivery.updateStatusTitle');
    let message = t('delivery.updateStatusConfirm');
    let confirmText = t('common.update');
    let iconName: any = 'truck-delivery';
    let themeColor: string = colors.primary[600];

    // Customize based on action
    if (isStartDelivery) {
        title = t('delivery.startDeliveryTitle');
        message = t('delivery.startDeliveryConfirm', { id: orderId?.slice(0, 8) });
        confirmText = t('delivery.startDelivery');
        iconName = 'truck-fast';
        themeColor = colors.primary[600];
    } else if (isDelivered) {
        title = t('delivery.confirmDeliveryTitle');
        message = t('delivery.confirmDeliveryConfirm', { id: orderId?.slice(0, 8) });
        confirmText = t('delivery.confirmDelivered');
        iconName = 'check-circle';
        themeColor = colors.success[600];
    } else if (isCanceled) {
        title = t('delivery.cancelDeliveryTitle');
        message = t('delivery.cancelDeliveryConfirm', { id: orderId?.slice(0, 8) });
        confirmText = t('delivery.cancelAction');
        iconName = 'alert-circle';
        themeColor = colors.error[600];
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none" // We handle animation
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                {/* Content */}
                <AnimatedView
                    style={[styles.contentContainer, animatedStyle]}
                >
                    {/* Header Icon */}
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, { shadowColor: themeColor }]}>
                            <Icon name={iconName} size={32} color={themeColor} />
                        </View>
                    </View>

                    {/* Text Content */}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.primaryButton,
                                { backgroundColor: themeColor, shadowColor: themeColor }
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{confirmText}</Text>
                            <Icon name={isDelivered ? "check" : isCanceled ? "close" : "arrow-right"} size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </AnimatedView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    contentContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: -40,
        zIndex: 1,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
        marginTop: 10,
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        gap: 12,
        marginBottom: 16,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryButton: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    secondaryButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    secondaryButtonText: {
        color: '#4B5563',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DeliveryStatusModal;
