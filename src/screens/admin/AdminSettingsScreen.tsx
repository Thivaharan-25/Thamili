import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { isTablet, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';
import { AnimatedView, LogoutModal } from '../../components';

type AdminSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const AdminSettingsScreen = () => {
  const navigation = useNavigation<AdminSettingsScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const padding = getResponsivePadding();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const renderSettingItem = (
    title: string,
    description: string,
    icon: any,
    iconColor: string,
    onPress?: () => void,
    isDestructive = false,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: isDestructive ? colors.error[50] : iconColor + '15' }]}>
        <Icon name={icon} size={24} color={isDestructive ? colors.error[500] : iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, isDestructive && { color: colors.error[600] }]}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {rightElement || <Icon name="chevron-right" size={20} color={colors.neutral[300]} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>


      {/* Header */}
      <View style={styles.headerContainer}>
        <ExpoLinearGradient
          colors={[colors.navy[900], colors.navy[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
        >
          <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('admin.settings.title')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </ExpoLinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingHorizontal: padding.horizontal,
          paddingBottom: padding.vertical * 2,
          paddingTop: 20
        }}
        showsVerticalScrollIndicator={false}
      >

        <AnimatedView animation="fade" delay={200} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.adminInfo')}</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="shield-account" size={20} color={colors.navy[600]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('admin.settings.role')}</Text>
                <Text style={styles.infoValue}>{t('admin.settings.administrator')}</Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="email" size={20} color={colors.navy[600]} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('admin.settings.email')}</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </AnimatedView>

        <AnimatedView animation="fade" delay={300} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.settings.preferences')}</Text>
          <View style={styles.card}>
            {renderSettingItem(
              t('admin.settings.notifications'),
              t('admin.settings.viewNotificationHistory'),
              'bell-outline',
              colors.warning[500],
              () => navigation.navigate('NotificationHistory')
            )}
            <View style={styles.separator} />
            {renderSettingItem(
              t('admin.settings.manageDeliveryMan'),
              t('admin.settings.configureDeliveryOptions'),
              'account-group',
              colors.info[500],
              () => navigation.navigate('ManageDeliveryMan' as any)
            )}
          </View>
        </AnimatedView>

        <AnimatedView animation="fade" delay={400} style={styles.section}>
          <View style={styles.card}>
            {renderSettingItem(
              t('admin.settings.logout'),
              t('admin.settings.signOut'),
              'logout',
              colors.error[500],
              handleLogout,
              true
            )}
          </View>
          <Text style={styles.versionText}>{t('admin.settings.appVersion')} 1.0.0</Text>
        </AnimatedView>

      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogout={confirmLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    marginBottom: 0,
  },
  headerGradient: {
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 8, // Inner padding for items
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy[900],
    marginBottom: 2,
    flexShrink: 1,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    flexShrink: 1,
  },

  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 72, // Align with text start
    marginRight: 12,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy[900],
  },

  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: colors.neutral[400],
    fontSize: 12,
    marginBottom: 20,
  }
});

export default AdminSettingsScreen;
