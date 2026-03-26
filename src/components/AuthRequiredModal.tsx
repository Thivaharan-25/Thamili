import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, createAnimatedComponent } from '../utils/reanimatedWrapper';
import { colors } from '../theme';

const AnimatedView = createAnimatedComponent(View);

interface AuthRequiredModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    onRegister: () => void;
}

const { width } = Dimensions.get('window');

const AuthRequiredModal = ({ visible, onClose, onLogin, onRegister }: AuthRequiredModalProps) => {
    const { t } = useTranslation();
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

    if (!visible) return null;

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
                            <Icon name="account-plus" size={32} color={colors.primary[500]} />
                        </View>
                    </View>

                    {/* Text Content */}
                    <Text style={styles.title}>{t('auth.joinToOrder')}</Text>
                    <Text style={styles.message}>
                        {t('auth.authRequiredMessage')}
                    </Text>

                    {/* Benefits List */}
                    <View style={styles.benefitsContainer}>
                        <BenefitRow icon="truck-delivery" text={t('auth.benefitDelivery')} />
                        <BenefitRow icon="tag-outline" text={t('auth.benefitDeals')} />
                        <BenefitRow icon="history" text={t('auth.benefitHistory')} />
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={onRegister}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{t('auth.signUpFree')}</Text>
                            <Icon name="arrow-right" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={onLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>{t('auth.login')}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>{t('auth.continueBrowsing')}</Text>
                    </TouchableOpacity>
                </AnimatedView>
            </View>
        </Modal>
    );
};

const BenefitRow = ({ icon, text }: { icon: any; text: string }) => (
    <View style={styles.benefitRow}>
        <Icon name="check-circle" size={16} color={colors.success[500]} />
        <Text style={styles.benefitText}>{text}</Text>
    </View>
);

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
        marginTop: -40, // Pull up to overlap boundary
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
    benefitsContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 12,
    },
    benefitText: {
        fontSize: 14,
        color: '#4B5563',
        marginLeft: 8,
        fontWeight: '500',
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
        backgroundColor: colors.primary[500] || '#0FA9E6',
        shadowColor: colors.primary[500] || '#0FA9E6',
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
    closeButton: {
        alignItems: 'center',
        padding: 8,
    },
    closeButtonText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default React.memo(AuthRequiredModal);
