import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { AppHeader, ThemeToggle, PerformanceIndicator, ConfirmationModal } from '../../components';
import { RootStackParamList } from '../../types';
import { isSmallDevice, isTablet, getResponsivePadding, getResponsiveFontSize } from '../../utils/responsive';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { t, i18n } = useTranslation();
  const { user, deleteAccount, isLoading } = useAuthStore();
  const padding = getResponsivePadding();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    const result = await deleteAccount();
    if (!result.success) {
      const errorMsg = result.error || t('errors.somethingWentWrong');
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert(t('common.error'), errorMsg);
      }
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('settings.title')} showBack />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: padding.vertical,
          maxWidth: isTablet() ? 600 : '100%',
          alignSelf: isTablet() ? 'center' : 'stretch',
        }}
      >
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('settings.language')}
          </Text>
          <View style={styles.languageOptions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.languageOption,
                i18n.language === 'en' && styles.languageOptionActive,
              ]}
              onPress={() => changeLanguage('en')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  i18n.language === 'en' && styles.languageOptionTextActive,
                ]}
              >
                {t('settings.english')}
              </Text>
              {i18n.language === 'en' && (
                <Icon name="check" size={20} color={colors.info[500]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.languageOption,
                i18n.language === 'ta' && styles.languageOptionActive,
              ]}
              onPress={() => changeLanguage('ta')}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  i18n.language === 'ta' && styles.languageOptionTextActive,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('settings.tamil')}
              </Text>
              {i18n.language === 'ta' && (
                <Icon name="check" size={20} color={colors.info[500]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {user && (
          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('profile.title')}
            </Text>
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('profile.email')}:
              </Text>
              <Text
                style={styles.infoValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.email}
              </Text>
            </View>
            {user.name && (
              <View style={styles.infoRow}>
                <Text
                  style={styles.infoLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('profile.name')}:
                </Text>
                <Text
                  style={styles.infoValue}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user.name}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('profile.role')}:
              </Text>
              <Text
                style={styles.infoValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.role === 'admin' ? t('profile.admin') : t('profile.customer')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.settingItem}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <Icon name="account-edit" size={24} color={colors.info[500]} />
            <Text style={styles.settingText}>{t('settings.editProfile')}</Text>
            <Icon name="chevron-right" size={24} color={colors.neutral[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.settingItem}
            onPress={() => navigation.navigate('ChangePassword' as never)}
          >
            <Icon name="lock-reset" size={24} color={colors.info[500]} />
            <Text style={styles.settingText}>{t('settings.changePassword')}</Text>
            <Icon name="chevron-right" size={24} color={colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
          <ThemeToggle />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.performance')}</Text>
          <PerformanceIndicator
            showNetworkSpeed={true}
            showCacheStatus={true}
            style={styles.performanceIndicator}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <Text style={styles.versionText}>
            {t('settings.version')}: 1.0.0
          </Text>
        </View>

        {user?.role !== 'admin' && (
          <View style={[styles.section, { marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 20 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.deleteItem}
              onPress={handleDeleteAccount}
              disabled={isLoading}
            >
              <Icon name="account-remove-outline" size={24} color={colors.error[500]} />
              <Text style={styles.deleteText}>
                {isLoading ? t('common.processing') : t('settings.deleteAccount')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              {t('settings.deleteHelper')}
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
        title={t('settings.deleteAccountTitle')}
        message={t('settings.deleteAccountMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        icon="account-remove-outline"
        confirmColor={colors.error[500]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
  },
  languageOptions: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  languageOptionActive: {
    borderColor: colors.info[500],
    backgroundColor: colors.info[50],
  },
  languageOptionText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  languageOptionTextActive: {
    color: colors.info[500],
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: isSmallDevice() ? 'column' : 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: isSmallDevice() ? 4 : 0,
  },
  infoLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: colors.text.secondary,
    width: isSmallDevice() ? '100%' : 100,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  versionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  performanceIndicator: {
    marginTop: 8,
  },
  deleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  deleteText: {
    fontSize: 16,
    color: colors.error[500],
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
    marginLeft: 36,
  },
});

export default SettingsScreen;
