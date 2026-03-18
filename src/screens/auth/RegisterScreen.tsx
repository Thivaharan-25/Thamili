import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, ErrorMessage, AnimatedView, GoogleLoginButton, CountrySelector, AuthBackButton } from '../../components';
import { validateForm } from '../../utils/validation';
// We'll use a simpler validation logic inline or update schema later, 
// for now manual validation is sufficient for this refactor to ensure it works perfect.
import { colors } from '../../theme';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { ASSETS } from '../../constants/assets';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import {
  isSmallDevice,
  isTablet,
  getResponsivePadding,
  getResponsiveFontSize,
} from '../../utils/responsive';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { t } = useTranslation();
  const { registerWithUsername, loginWithGoogle, isLoading } = useAuthStore();

  // Form State
  // Name removed as per request - using username as fallback for name
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Optional contact email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES.GERMANY);

  // UI State
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');

  // Responsive dimensions
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const padding = getResponsivePadding();

  const handleRegister = async () => {
    setErrors({});
    setApiError('');

    const newErrors: Record<string, string> = {};

    // Validation
    if (!username.trim() || username.length < 3) {
      newErrors.username = t('auth.usernameTooShort');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = t('auth.usernameHelper');
    }

    // Email is optional, but if provided, should be valid (basic check)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!password || password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Proceed with registration
    // Using username as the name since name field is removed
    const result = await registerWithUsername(
      username,
      password,
      username, // Pass username as name
      email || null,
      selectedCountry
    );

    if (!result.success) {
      setApiError(result.error || 'Registration failed');
    } else {
      // SUCCESS!
      // If we don't have a session, it means email verification is required (Gmail case)
      const { user } = useAuthStore.getState();
      if (!user) {
        // Navigate to the verification instructions screen
        navigation.navigate('VerifyEmail', { email: email?.trim() || '' });
      }
    }
    // Navigation happens automatically on success via AuthNavigator listening to auth state 
    // IF the user is auto-logged in (dummy account case)
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (!result.success) {
      setApiError(result.error || 'Google login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
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
          <AnimatedView animation="fade" delay={0} style={{ marginBottom: 32 }}>
            <View className="items-center mb-6">
              <View style={{
                width: isSmall ? 100 : isTabletDevice ? 150 : 120,
                height: isSmall ? 100 : isTabletDevice ? 150 : 120,
                borderRadius: isSmall ? 50 : isTabletDevice ? 75 : 60,
                backgroundColor: colors.primary[500] + '10',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: padding.vertical * 1.5,
              }}>
                <Image
                  source={ASSETS.logo}
                  style={{
                    width: isSmall ? 70 : isTabletDevice ? 110 : 90,
                    height: isSmall ? 70 : isTabletDevice ? 110 : 90,
                  }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{
                fontSize: getResponsiveFontSize(isSmall ? 28 : isTabletDevice ? 48 : 36, 24, 48),
                fontWeight: 'bold',
                color: colors.neutral[900],
                marginBottom: 8,
                textAlign: 'center',
              }}>
                {t('auth.register')}
              </Text>
              <Text style={{
                fontSize: getResponsiveFontSize(16, 14, 18),
                color: colors.neutral[500],
                textAlign: 'center',
                marginBottom: 20,
              }}>
                {t('auth.createAccount')}
              </Text>
            </View>
          </AnimatedView>

          {/* Form */}
          <AnimatedView
            animation="slide"
            delay={100}
            enterFrom="bottom"
            style={{ flex: 1 }}
          >
            <View className="mb-6">
              {!!apiError && (
                <ErrorMessage
                  message={apiError}
                  type="error"
                  onDismiss={() => setApiError('')}
                />
              )}

              <Text className="text-xs text-neutral-500 mb-1 ml-1">
                {t('common.required')}
              </Text>
              {/* Form Inputs */}
              {[
                {
                  id: 'username',
                  placeholder: t('auth.enterUsername'),
                  value: username,
                  setValue: (text: string) => {
                    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                    setUsername(cleaned);
                    if (errors.username) setErrors({ ...errors, username: '' });
                  },
                  autoComplete: 'username',
                  icon: 'account-circle-outline',
                  error: errors.username,
                },
                {
                  id: 'email',
                  placeholder: t('auth.gmailOptional'),
                  value: email,
                  setValue: (text: string) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  },
                  autoComplete: 'email',
                  keyboardType: 'email-address',
                  icon: 'email-outline',
                  error: errors.email,
                },
                {
                  id: 'password',
                  placeholder: t('auth.password'),
                  value: password,
                  setValue: (text: string) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  },
                  autoComplete: 'password-new',
                  secureTextEntry: !isPasswordVisible,
                  icon: 'lock-outline',
                  rightIcon: isPasswordVisible ? "eye-off" : "eye",
                  onRightIconPress: () => setIsPasswordVisible(!isPasswordVisible),
                  error: errors.password,
                },
                {
                  id: 'confirmPassword',
                  placeholder: t('auth.confirmPassword'),
                  value: confirmPassword,
                  setValue: (text: string) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  },
                  autoComplete: 'password-new',
                  secureTextEntry: !isConfirmPasswordVisible,
                  icon: 'lock-check-outline',
                  rightIcon: isConfirmPasswordVisible ? "eye-off" : "eye",
                  onRightIconPress: () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible),
                  error: errors.confirmPassword,
                  containerStyle: { marginBottom: 24 }
                }
              ].map((input) => (
                <Input
                  key={input.id}
                  placeholder={input.placeholder}
                  value={input.value}
                  onChangeText={input.setValue}
                  autoCapitalize="none"
                  autoComplete={input.autoComplete as any}
                  keyboardType={input.keyboardType as any}
                  error={input.error}
                  leftIcon={input.icon as any}
                  rightIcon={input.rightIcon as any}
                  onRightIconPress={input.onRightIconPress}
                  secureTextEntry={input.secureTextEntry}
                  containerStyle={input.containerStyle || { marginBottom: 16 }}
                />
              ))}

              <View style={{ marginBottom: 24 }}>
                <CountrySelector
                  selectedCountry={selectedCountry}
                  onSelectCountry={setSelectedCountry}
                  compact={false}
                />
              </View>

              <Button
                title={t('auth.register')}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                size="lg"
                style={{ marginBottom: 16 }}
              />

              <View className="flex-row items-center justify-center my-4">
                <View className="h-[1px] bg-neutral-200 flex-1" />
                <Text className="mx-4 text-neutral-400 font-medium">{t('common.or')}</Text>
                <View className="h-[1px] bg-neutral-200 flex-1" />
              </View>

              <GoogleLoginButton
                onPress={handleGoogleLogin}
                loading={isLoading}
                text={t('auth.signUpWithGoogle')}
                style={{ marginBottom: 16 }}
              />

              <View className="flex-row items-center justify-center mt-4">
                <Text className="text-sm text-neutral-500 mr-1">
                  {t('auth.alreadyHaveAccount')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text className="text-sm font-semibold text-primary-500">
                    {t('auth.login')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedView>
        </View>
      </ScrollView>

      <AuthBackButton />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
});

export default RegisterScreen;
