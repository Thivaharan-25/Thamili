import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withTiming, createAnimatedComponent, Easing } from '../utils/reanimatedWrapper';
import { colors } from '../theme';
import { useTranslation } from 'react-i18next';

const AnimatedView = createAnimatedComponent(View);

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const { width } = Dimensions.get('window');

const LogoutModal = ({ visible, onClose, onLogout }: LogoutModalProps) => {
    const { t } = useTranslation();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);
    const [shouldRender, setShouldRender] = React.useState(visible);

    React.useEffect(() => {
        if (visible) {
            setShouldRender(true);
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(0)) });
        } else {
            opacity.value = withTiming(0, { duration: 250 });
            translateY.value = withTiming(50, { duration: 250 });
            // Give it time to animate out before unmounting
            const timer = setTimeout(() => setShouldRender(false), 250);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    if (!shouldRender && !visible) return null;

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
                            <Icon name="logout" size={32} color={colors.error[500]} />
                        </View>
                    </View>

                    {/* Text Content */}
                    <Text style={styles.title}>{t('auth.logoutConfirmTitle')}</Text>
                    <Text style={styles.message}>
                        {t('auth.logoutConfirmMessage')}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={onLogout}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{t('auth.logoutConfirmTitle')}</Text>
                            <Icon name="exit-to-app" size={20} color="white" />
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

export default LogoutModal;
