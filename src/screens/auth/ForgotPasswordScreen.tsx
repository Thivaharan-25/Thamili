import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, ErrorMessage, AnimatedView, AlertModal, AuthBackButton } from '../../components';
import { colors } from '../../theme';
import {
    isSmallDevice,
    isTablet,
    getResponsivePadding,
    getResponsiveFontSize,
} from '../../utils/responsive';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

type Stage = 'username' | 'confirm_email' | 'new_email' | 'confirm_new_email' | 'success';

const ForgotPasswordScreen = () => {
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const { t } = useTranslation();
    const { checkUsername, resetPasswordForEmail, recoverAccount, isLoading } = useAuthStore();

    // State
    const [stage, setStage] = useState<Stage>('username');
    const [username, setUsername] = useState('');
    const [foundEmail, setFoundEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');

    // Responsive
    const isSmall = isSmallDevice();
    const isTabletDevice = isTablet();
    const padding = getResponsivePadding();

    const handleCheckUsername = async () => {
        if (!username.trim()) {
            setError(t('auth.enterUsername'));
            return;
        }
        setError('');

        const result = await checkUsername(username);

        if (!result.exists) {
            setError(result.error || t('errors.unexpectedError'));
            return;
        }

        if (result.isDummy) {
            // Scenario B: No real email found
            setStage('new_email');
        } else {
            // Scenario A: Real email found
            setFoundEmail(result.email || '');
            setStage('confirm_email');
        }
    };

    const handleSendResetToExisting = async () => {
        const result = await resetPasswordForEmail(foundEmail);
        if (result.success) {
            setStage('success');
        } else {
            setError(result.error || t('errors.somethingWentWrong'));
        }
    };

    const handleNewEmailSubmit = () => {
        if (!newEmail.trim()) {
            setError(t('auth.enterEmail'));
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError(t('errors.invalidEmail') || 'Invalid email');
            return;
        }
        setError('');
        // PROCEED TO CONFIRMATION
        setStage('confirm_new_email');
    };

    const handleRecoverAccount = async () => {
        const result = await recoverAccount(username, newEmail);

        if (result.success) {
            setFoundEmail(newEmail); // To show in success message
            setStage('success');
        } else {
            const errorMessage = result.error || t('errors.somethingWentWrong');

            if (errorMessage.includes('already in use') ||
                errorMessage.includes('unique constraint') ||
                errorMessage.includes('duplicate key')) {
                setError(t('errors.emailAlreadyInUse') || 'This email is already associated with another account.');
            } else {
                setError(errorMessage);
            }
        }
    };

    const renderUsernameStage = () => (
        <AnimatedView animation="slide" enterFrom="bottom" style={{ width: '100%' }}>
            <Text style={{
                fontSize: 16,
                color: colors.neutral[600],
                textAlign: 'center',
                marginBottom: 24
            }}>
                {t('auth.enterUsernameToFindAccount')}
            </Text>

            <Input
                placeholder={t('auth.enterUsername')}
                value={username}
                onChangeText={(text) => {
                    setUsername(text);
                    setError('');
                }}
                autoCapitalize="none"
                leftIcon="account"
                containerStyle={{ marginBottom: 24 }}
                error={error}
            />

            <Button
                title={t('auth.findAccount')}
                onPress={handleCheckUsername}
                loading={isLoading}
                fullWidth
                size="lg"
            />
        </AnimatedView>
    );

    const renderConfirmEmailStage = () => (
        <AnimatedView animation="slide" enterFrom="right" style={{ width: '100%' }}>
            <Text style={{
                fontSize: 16,
                color: colors.neutral[600],
                textAlign: 'center',
                marginBottom: 24
            }}>
                {t('auth.foundEmailAssociated')}
            </Text>

            <View style={{
                backgroundColor: colors.primary[50],
                padding: 16,
                borderRadius: 12,
                marginBottom: 24,
                alignItems: 'center'
            }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary[700] }}>
                    {/* Mask email for security: m***@gmail.com */}
                    {foundEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)}
                </Text>
            </View>

            <Button
                title={t('auth.sendResetLink')}
                onPress={handleSendResetToExisting}
                loading={isLoading}
                fullWidth
                size="lg"
                style={{ marginBottom: 16 }}
            />


        </AnimatedView>
    );

    const renderNewEmailStage = () => (
        <AnimatedView animation="slide" enterFrom="right" style={{ width: '100%' }}>
            <Text style={{
                fontSize: 16,
                color: colors.neutral[600],
                textAlign: 'center',
                marginBottom: 24
            }}>
                {t('auth.noEmailFound', "It looks like you don't have a verified email linked to this account. Please enter an email address to verify your account.")}
            </Text>

            <Input
                placeholder={t('auth.enterEmail')}
                value={newEmail}
                onChangeText={(text) => {
                    setNewEmail(text);
                    setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon="email"
                containerStyle={{ marginBottom: 24 }}
                error={error}
            />

            <Button
                title={t('common.next')}
                onPress={handleNewEmailSubmit}
                loading={isLoading}
                fullWidth
                size="lg"
            />
        </AnimatedView>
    );

    const renderConfirmNewEmailStage = () => (
        <AnimatedView animation="slide" enterFrom="right" style={{ width: '100%' }}>
            <Text style={{
                fontSize: 16,
                color: colors.neutral[600],
                textAlign: 'center',
                marginBottom: 24
            }}>
                {t('auth.isEmailCorrect')}
            </Text>

            <View style={{
                backgroundColor: colors.primary[50],
                padding: 16,
                borderRadius: 12,
                marginBottom: 24,
                alignItems: 'center'
            }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary[700] }}>
                    {/* Mask email for security? We show it here as confirmation */}
                    {newEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c)}
                </Text>
            </View>

            <Button
                title={t('auth.sendVerificationLink') || "Send Verification Link"}
                onPress={handleRecoverAccount}
                loading={isLoading}
                fullWidth
                size="lg"
                style={{ marginBottom: 16 }}
            />

            <Button
                title={t('auth.editEmail')}
                onPress={() => setStage('new_email')}
                variant="ghost"
                fullWidth
            />
        </AnimatedView>
    );

    const renderSuccessStage = () => (
        <AnimatedView animation="fade" style={{ alignItems: 'center', width: '100%' }}>
            <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: colors.success[50],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
            }}>
                <Icon name="email-check" size={50} color={colors.success[500]} />
            </View>

            <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: colors.neutral[900],
                marginBottom: 16,
                textAlign: 'center'
            }}>
                {t('auth.checkYourEmail')}
            </Text>

            <Text style={{
                fontSize: 16,
                color: colors.neutral[600],
                textAlign: 'center',
                marginBottom: 32,
                lineHeight: 24
            }}>
                {newEmail
                    ? t('auth.verificationLinkSent')
                    : t('auth.resetLinkSent')
                }
            </Text>

            <Button
                title={t('auth.backToLogin')}
                onPress={() => navigation.navigate('Login')}
                fullWidth
                size="lg"
                variant="outline"
            />
        </AnimatedView>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.white }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{
                    flex: 1,
                    paddingHorizontal: padding.horizontal * 1.5,
                    paddingTop: isSmall ? padding.vertical * 2 : padding.vertical * 4,
                    paddingBottom: padding.vertical * 2,
                    maxWidth: isTabletDevice ? 600 : '100%',
                    alignSelf: isTabletDevice ? 'center' : 'stretch',
                }}>

                    {/* Header */}
                    <AnimatedView animation="fade" delay={0} style={{ marginBottom: 32, alignItems: 'center' }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: colors.primary[50], // fallsafe to light color
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}>
                            <Icon name="lock-reset" size={40} color={colors.primary[500]} />
                        </View>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: 'bold',
                            color: colors.neutral[900],
                            textAlign: 'center',
                        }}>
                            {stage === 'success' ? t('auth.emailSent') : t('auth.forgotPasswordTitle')}
                        </Text>
                    </AnimatedView>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                        {stage === 'username' && renderUsernameStage()}
                        {stage === 'confirm_email' && renderConfirmEmailStage()}
                        {stage === 'new_email' && renderNewEmailStage()}
                        {stage === 'confirm_new_email' && renderConfirmNewEmailStage()}
                        {stage === 'success' && renderSuccessStage()}
                    </View>

                </View>
            </ScrollView>

            {stage !== 'success' && (
                <AuthBackButton
                    onPress={() => {
                        if (stage === 'username') navigation.goBack();
                        else if (stage === 'confirm_email') setStage('username');
                        else if (stage === 'new_email') setStage('username');
                        else if (stage === 'confirm_new_email') setStage('new_email');
                    }}
                />
            )}
        </KeyboardAvoidingView>
    );
};

export default ForgotPasswordScreen;
