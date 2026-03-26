import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, ErrorMessage, AnimatedView, GoogleLoginButton, AuthBackButton } from '../../components';
import { usernameLoginSchema, validateForm } from '../../utils/validation';
import { colors } from '../../theme';
import { ASSETS } from '../../constants/assets';
import {
  isSmallDevice,
  isTablet,
  getResponsivePadding,
  getResponsiveFontSize,
} from '../../utils/responsive';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { t } = useTranslation();
  const { loginWithUsername, loginWithGoogle, isLoading, isAuthenticated, user } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');
  const [shakeKey, setShakeKey] = useState(0);

  // Responsive dimensions
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const padding = getResponsivePadding();

  // Function to trigger shake animation by re-rendering with key
  const triggerShake = () => {
    setShakeKey(prev => prev + 1);
  };

  // Navigate when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ Login successful, user authenticated:', {
        role: user.role,
        email: user.email,
        name: user.name,
      });
      setApiError('');
    } else if (!isAuthenticated) {
      if (!isLoading) {
        // Don't clear apiError here - let it persist until user tries again
      }
    }
  }, [isAuthenticated, user, isLoading]);

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setApiError('');

    // Username/password login
    const validation = await validateForm(usernameLoginSchema, { username, password });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const result = await loginWithUsername(username, password);
    if (!result.success) {
      const errorMessage = result.error || t('errors.somethingWentWrong') || 'Invalid username or password. Please try again.';
      setApiError(errorMessage);
      triggerShake();
      return;
    } else {
      setApiError('');
      setShakeKey(0);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
      style={{ flex: 1, backgroundColor: colors.background.tertiary }}
    >
      <ScrollView
        className="flex-1"
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
          {/* Header with Animation */}
          <AnimatedView animation="fade" delay={0} style={{ marginBottom: 48 }}>
            <View className="items-center mb-8">
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
                {t('auth.login')}
              </Text>
              <Text className="text-base text-neutral-500 text-center">
                {t('auth.welcomeBack')}
              </Text>
            </View>
          </AnimatedView>

          {/* Form with Animation */}
          <AnimatedView
            key={shakeKey}
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
                  style={{
                    marginBottom: 16,
                    backgroundColor: colors.error[50] || '#FEF2F2',
                    borderLeftWidth: 4,
                    borderLeftColor: colors.error[500] || '#EF4444',
                    padding: 12,
                    borderRadius: 8,
                  }}
                />
              )}

              {/* Username login */}
              {/* Username/Password Inputs */}
              {[
                {
                  placeholder: t('auth.enterUsername'),
                  value: username,
                  onChangeText: (text: string) => {
                    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                    setUsername(cleaned);
                    if (errors.username) setErrors({ ...errors, username: '' });
                  },
                  autoCapitalize: "none" as const,
                  autoComplete: "username" as const,
                  error: errors.username,
                  leftIcon: "account-outline",
                  containerStyle: { marginBottom: 20 }
                },
                {
                  placeholder: t('auth.password'),
                  value: password,
                  onChangeText: (text: string) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  },
                  secureTextEntry: !isPasswordVisible,
                  autoComplete: "password" as const,
                  error: errors.password,
                  leftIcon: "lock-outline",
                  rightIcon: isPasswordVisible ? "eye-off" : "eye",
                  onRightIconPress: () => setIsPasswordVisible(!isPasswordVisible),
                  containerStyle: { marginBottom: 8 }
                }
              ].map((inputProps, index) => (
                <Input key={index} {...inputProps} />
              ))}

              <TouchableOpacity
                onPress={handleForgotPassword}
                className="self-end mb-6"
              >
                <Text className="text-sm font-semibold text-primary-500">
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>

              <Button
                title={t('auth.login')}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading || !username || !password}
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
                style={{ marginBottom: 16 }}
              />

              <View className="flex-row items-center justify-center mt-4">
                <Text className="text-sm text-neutral-500 mr-1">
                  {t('auth.dontHaveAccount')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text className="text-sm font-semibold text-primary-500">
                    {t('auth.register')}
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
});

export default LoginScreen;
