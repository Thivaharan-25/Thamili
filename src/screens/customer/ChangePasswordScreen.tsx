import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Pressable, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, ErrorMessage, AnimatedView, useToast } from '../../components';
import { passwordChangeSchema, validateForm } from '../../utils/validation';
import { isTablet, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';

type ChangePasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const ChangePasswordScreen = () => {
  const navigation = useNavigation<ChangePasswordScreenNavigationProp>();
  const { t } = useTranslation();
  const { changePassword } = useAuthStore();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const padding = getResponsivePadding();

  const handleChangePassword = async () => {
    setErrors({});
    setApiError('');

    // Validate form
    const validation = await validateForm(passwordChangeSchema, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsLoading(false);

    if (result.success) {
      showToast({
        message: t('auth.passwordChangedSuccess'),
        type: 'success',
        duration: 2000,
      });
      navigation.goBack();
    } else {
      setApiError(result.error || t('errors.somethingWentWrong'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t('auth.changePassword')}</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{
            paddingBottom: 40,
            maxWidth: isTablet() ? 600 : '100%',
            alignSelf: isTablet() ? 'center' : 'stretch',
          }}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedView animation="slide" enterFrom="bottom" duration={600}>
            {/* Introductory Text */}
            <View style={styles.introSection}>
              <View style={styles.iconContainer}>
                <Icon name="lock-reset" size={32} color={colors.primary[600]} />
              </View>
              <Text style={styles.introTitle}>{t('auth.updatePassword')}</Text>
              <Text style={styles.introText}>
                {t('auth.updatePasswordDesc')}
              </Text>
            </View>

            <View style={styles.formCard}>
              {apiError ? (
                <View style={{ marginBottom: 16 }}>
                  <ErrorMessage
                    message={apiError}
                    onDismiss={() => setApiError('')}
                  />
                </View>
              ) : null}

              <View style={styles.inputSpacing}>
                <Input
                  label={t('auth.currentPassword')}
                  placeholder={t('auth.enterCurrentPassword')}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
                  }}
                  secureTextEntry={!showCurrentPassword}
                  error={errors.currentPassword}
                  leftIcon={<Icon name="lock-outline" size={20} color={colors.neutral[400]} />}
                  rightIcon={showCurrentPassword ? "eye-off" : "eye"}
                  onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
                />
              </View>

              <View style={styles.inputSpacing}>
                <Input
                  label={t('auth.newPassword')}
                  placeholder={t('auth.enterNewPassword')}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                  }}
                  secureTextEntry={!showNewPassword}
                  error={errors.newPassword}
                  leftIcon={<Icon name="key-outline" size={20} color={colors.neutral[400]} />}
                  rightIcon={showNewPassword ? "eye-off" : "eye"}
                  onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                />
              </View>

              <View style={styles.inputSpacing}>
                <Input
                  label={t('auth.confirmNewPassword')}
                  placeholder={t('auth.confirmNewPassword')}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmPassword}
                  leftIcon={<Icon name="check-circle-outline" size={20} color={colors.neutral[400]} />}
                  rightIcon={showConfirmPassword ? "eye-off" : "eye"}
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </View>

              <View style={styles.actionButtons}>
                <Button
                  title={t('auth.updatePassword')}
                  onPress={handleChangePassword}
                  loading={isLoading}
                  disabled={isLoading}
                  fullWidth
                  style={styles.saveButton}
                  textStyle={{ fontSize: 16, fontWeight: '600' }}
                />
              </View>
            </View>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
    flexShrink: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  inputSpacing: {
    marginBottom: 20,
  },
  actionButtons: {
    marginTop: 12,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ChangePasswordScreen;
