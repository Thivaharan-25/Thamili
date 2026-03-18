import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { AnimatedView } from '../../components';
import { colors } from '../../theme';
import {
    isSmallDevice,
    isTablet,
    getResponsivePadding,
    getResponsiveFontSize,
} from '../../utils/responsive';

type VerifyEmailScreenRouteProp = RouteProp<RootStackParamList, 'VerifyEmail'>;
type VerifyEmailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VerifyEmail'>;

const VerifyEmailScreen = () => {
    const navigation = useNavigation<VerifyEmailScreenNavigationProp>();
    const route = useRoute<VerifyEmailScreenRouteProp>();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { email } = route.params || { email: 'your email' };

    const { isLoading } = useAuthStore();

    // Responsive dimensions
    const padding = getResponsivePadding();

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={[styles.content, { paddingHorizontal: padding.horizontal * 1.5 }]}>

                    <AnimatedView animation="fade" delay={100}>
                        <View style={styles.iconContainer}>
                            <Icon name="email-fast" size={80} color={colors.primary[500]} />
                        </View>
                    </AnimatedView>

                    <AnimatedView animation="slide" delay={300} enterFrom="bottom">
                        <Text style={styles.title}>{t('auth.checkYourInbox')}</Text>
                        <Text style={styles.message}>
                            {t('auth.sentVerificationTo')}
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>

                        <View style={styles.card}>
                            <Icon
                                name="check-decagram-outline"
                                size={32}
                                color={colors.primary[500]}
                                style={{ marginBottom: 16 }}
                            />
                            <Text style={styles.instruction}>
                                {t('auth.clickLinkToActivate')}
                            </Text>
                            <Text style={styles.autoRedirect}>
                                {t('auth.autoRedirectNotice')}
                            </Text>
                        </View>
                    </AnimatedView>

                    <AnimatedView animation="fade" delay={600} style={{ marginTop: 40 }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.backButtonContent}>
                                <Icon name="chevron-left" size={20} color={colors.neutral[500]} />
                                <Text style={styles.backButtonText}>{t('auth.useDifferentEmail')}</Text>
                            </View>
                        </TouchableOpacity>
                    </AnimatedView>
                </View>
            </SafeAreaView>
        </View>
    );
};

// Simple SafeAreaView replacement if not imported
const SafeAreaView = ({ children, style }: any) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[{ paddingTop: insets.top, paddingBottom: insets.bottom }, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Match Home Screen light theme
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.primary[50], // Very light blue
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(58, 181, 209, 0.1)',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.navy[900], // Match app typography
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.neutral[500],
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary[600],
        textAlign: 'center',
        marginBottom: 40,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: Dimensions.get('window').width - 64,
        shadowColor: colors.navy[900],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
    },
    instruction: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.navy[700],
        textAlign: 'center',
        fontWeight: '500',
    },
    autoRedirect: {
        fontSize: 14,
        color: colors.neutral[400],
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    backButton: {
        padding: 12,
    },
    backButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: colors.neutral[500],
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 4,
    },
});

export default VerifyEmailScreen;
