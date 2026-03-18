import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, createAnimatedComponent } from '../utils/reanimatedWrapper';
import { colors } from '../theme';

const AnimatedView = createAnimatedComponent(View);

interface RemoveItemModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    count?: number;
    isMultiple?: boolean;
    title?: string;
    message?: string;
}

const { width } = Dimensions.get('window');

const RemoveItemModal = ({
    visible,
    onClose,
    onConfirm,
    itemName,
    count,
    isMultiple = false,
    title: customTitle,
    message: customMessage
}: RemoveItemModalProps) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

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

    const { t } = useTranslation();

    if (!visible) return null;

    let displayTitle;
    let displayMessage;

    if (customTitle) {
        displayTitle = customTitle;
    } else {
        displayTitle = isMultiple ? t('cart.removeSelectedItems') : t('cart.removeItem');
    }

    if (customMessage) {
        displayMessage = customMessage;
    } else {
        displayMessage = isMultiple
            ? t('cart.confirmRemoveMultiple', { count: count || 0, plural: (count || 0) > 1 ? 's' : '' })
            : itemName
                ? t('cart.confirmRemoveSingle', { itemName })
                : t('cart.confirmRemoveItem');
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                <AnimatedView
                    style={[styles.contentContainer, animatedStyle]}
                >
                    {/* Header Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Icon name="delete-outline" size={32} color={colors.error[500]} />
                        </View>
                    </View>

                    {/* Text Content */}
                    <Text style={styles.title}>{displayTitle}</Text>
                    <Text style={styles.message}>
                        {displayMessage}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{t('common.delete')}</Text>
                            <Icon name="trash-can-outline" size={20} color="white" />
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
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    contentContainer: {
        backgroundColor: 'white',
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
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
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
        backgroundColor: colors.error[500],
        shadowColor: colors.error[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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

export default RemoveItemModal;

