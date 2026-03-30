import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Pressable, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services';
import { Button, Input, ErrorMessage, CountrySelector, useToast, AnimatedView } from '../../components';
import { profileUpdateSchema, validateForm } from '../../utils/validation';
import { validateName, validatePhone } from '../../utils/fieldValidation';
import { formatPhoneNumber } from '../../utils/regionalFormatting';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import { isTablet, getResponsivePadding } from '../../utils/responsive';

type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const getRoleIcon = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'shield-account';
    case 'delivery_partner':
    case 'delivery':
      return 'truck-delivery';
    default: // customer
      return 'account';
  }
};

const getRoleColor = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return { bg: colors.navy[100], text: colors.navy[700] };
    case 'delivery_partner':
    case 'delivery':
      return { bg: colors.secondary[100], text: colors.secondary[700] };
    default: // customer
      return { bg: colors.primary[100], text: colors.primary[700] };
  }
};

const EditProfileScreen = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES.GERMANY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const padding = getResponsivePadding();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      const countryPref = user.country_preference || COUNTRIES.GERMANY;
      setCountry(countryPref);

      // Extract subscriber part from stored phone number
      const fullPhone = user.phone || '';
      const prefix = countryPref === COUNTRIES.GERMANY ? '49' : '45';
      const digits = fullPhone.replace(/\D/g, '');

      if (digits.startsWith(prefix)) {
        setPhone(digits.substring(prefix.length));
      } else {
        setPhone(digits);
      }
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setErrors({});
    setApiError('');

    // Reconstruct full phone number for validation and saving
    const prefix = country === COUNTRIES.GERMANY ? '+49' : '+45';
    const fullPhone = `${prefix}${phone.replace(/\s/g, '')}`;

    // Validate form
    const validation = await validateForm(profileUpdateSchema, { name, phone: fullPhone });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsLoading(true);
      const updatedUser = await userService.updateUserProfile(user.id, {
        name,
        phone: fullPhone,
        country_preference: country,
      });

      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile(user.id) });
      showToast({
        message: 'Profile updated successfully',
        type: 'success',
        duration: 2000,
      });
      navigation.goBack();
    } catch (error: any) {
      setApiError(error.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
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
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('Edit Profile') || 'Edit Profile'}
          </Text>
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
          <AnimatedView animation="slide" enterFrom="bottom" duration={300}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {user?.photoURL ? (
                  // Using Image component if photoURL exists (assuming native Image or from react-native)
                  // For now using Icon as placeholder logic similiar to ProfileScreen
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary[100] }]}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary[700] }}>
                      {name ? name[0].toUpperCase() : 'U'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: getRoleColor(user?.role).bg }]}>
                    <Icon
                      name={getRoleIcon(user?.role)}
                      size={40}
                      color={getRoleColor(user?.role).text}
                    />
                  </View>
                )}
              </View>

            </View>

            {/* Form Fields - Card Style */}
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
                  label={t('auth.name')}
                  placeholder={t('auth.name')}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  autoCapitalize="words"
                  error={errors.name}
                  validateOnChange={true}
                  showSuccess={true}
                  onValidate={validateName}
                  leftIcon={<Icon name="account-outline" size={20} color={colors.neutral[400]} />}
                />
              </View>

              <View style={styles.inputSpacing}>
                <Input
                  label={t('auth.phone')}
                  placeholder={country === COUNTRIES.GERMANY ? "123 4567890" : "12 34 56 78"}
                  value={phone}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '');
                    const maxLength = country === COUNTRIES.GERMANY ? 11 : 8;
                    if (digits.length > maxLength) return;

                    setPhone(digits);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  error={errors.phone}
                  validateOnChange={false} // Validation handled on Save to avoid prefix confusion
                  showSuccess={phone.length > 5}
                  leftIcon={
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="phone-outline" size={20} color={colors.neutral[400]} />
                      <Text style={{ marginLeft: 8, fontSize: 16, color: colors.neutral[900], fontWeight: '600' }}>
                        {country === COUNTRIES.GERMANY ? '+49' : '+45'}
                      </Text>
                      <View style={{ width: 1, height: 20, backgroundColor: colors.neutral[200], marginLeft: 8 }} />
                    </View>
                  }
                />
              </View>

              <View style={styles.inputSpacing}>

                <CountrySelector
                  selectedCountry={country}
                  onSelectCountry={setCountry}
                />
              </View>

              <View style={styles.actionButtons}>
                <Button
                  title={isLoading ? t('common.saving') : t('common.save')}
                  onPress={handleSave}
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20, // Overlap properly
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
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
  },
  inputSpacing: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
    marginLeft: 4,
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

export default EditProfileScreen;
