import React from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { ASSETS } from '../constants/assets';
import { COUNTRIES } from '../constants';
import Button from './Button';

interface HomeHeaderProps {
    isAuthenticated: boolean;
    user: any;
    selectedCountry: string | null;
    toggleLanguage: () => void;
    language: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
    isAuthenticated,
    user,
    selectedCountry,
    toggleLanguage,
    language
}) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    if (isAuthenticated) {
        return (
            // --- LOGGED IN HEADER DESIGN ---
            <LinearGradient
                colors={[colors.navy[900], colors.navy[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    paddingHorizontal: 24,
                    paddingTop: insets.top + 20,
                    paddingBottom: 48, // Extra padding for overlapping search bar
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    marginBottom: 0, // Remove bottom margin to let search bar overlap
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 20,
                    elevation: 10,
                    zIndex: 1,
                }}
            >
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <View className="flex-row items-center justify-between mb-8">
                    <View>
                        <Text className="text-neutral-300 text-sm font-medium mb-1">
                            {t('home.welcomeBack')},
                        </Text>
                        <Text className="text-white text-3xl font-extrabold tracking-tight" numberOfLines={1} adjustsFontSizeToFit>
                            {user?.name?.split(' ')[0] || t('common.member')} <Text style={{ fontSize: 24 }}>👋</Text>
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={toggleLanguage}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.1)',
                                marginRight: 12,
                            }}
                            activeOpacity={0.7}
                        >
                            <Icon name="translate" size={18} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                                {language === 'en' ? 'TA' : 'EN'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const parent = navigation?.getParent?.();
                                if (parent?.navigate) {
                                    parent.navigate('Main', { screen: 'Profile' });
                                } else if (navigation?.navigate) {
                                    navigation.navigate('Profile');
                                }
                            }}
                            className="bg-white/10 p-2 rounded-full border border-white/10"
                        >
                            <Image
                                source={user?.photoURL ? { uri: user.photoURL } : ASSETS.logo}
                                style={{ width: 40, height: 40, borderRadius: 20 }}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Card */}
                <View className="bg-white/10 rounded-2xl p-4 border border-white/10 flex-row items-center justify-between backdrop-blur-md">
                    <View className="flex-1">
                        <Text className="text-white/70 text-xs uppercase tracking-wider font-bold mb-1">{t('home.currentLocation')}</Text>
                        <View className="flex-row items-center">
                            <Icon name="map-marker" size={16} color={colors.primary[400]} style={{ marginRight: 4 }} />
                            <Text className="text-white font-bold text-base">
                                {selectedCountry === COUNTRIES.GERMANY ? t('profile.germany') : t('profile.denmark')}
                            </Text>
                        </View>
                    </View>
                    <View className="h-8 w-[1px] bg-white/20 mx-4" />
                    <View className="flex-1">
                        <Text className="text-white/70 text-xs uppercase tracking-wider font-bold mb-1">{t('home.status')}</Text>
                        <Text className="text-primary-400 font-bold text-sm">
                            {t('home.readyToOrder')}
                        </Text>
                    </View>
                </View>

            </LinearGradient>
        );
    }

    return (
        // --- GUEST HEADER DESIGN (Unchanged) ---
        <LinearGradient
            colors={[colors.navy[500], colors.primary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                paddingHorizontal: 20,
                paddingTop: insets.top + 12,
                paddingBottom: 12,
                zIndex: 1
            }}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 10 }}>
                <TouchableOpacity
                    onPress={toggleLanguage}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                    }}
                    activeOpacity={0.7}
                >
                    <Icon name="translate" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                        {language === 'en' ? 'TA' : 'EN'}
                    </Text>
                </TouchableOpacity>
            </View>
            {/* Guest Content */}
            <View className="items-center">
                <Image
                    source={ASSETS.logo}
                    style={{ width: 60, height: 60, marginBottom: 8 }}
                    resizeMode="contain"
                />
                <Text className="text-lg font-bold text-white mb-1 text-center">{t('home.welcome')}</Text>
                <Text className="text-xs text-white/90 text-center mb-2">{t('home.slogan')}</Text>

                {/* Benefits Row */}
                <View className="flex-row flex-wrap justify-center w-full mb-2 mt-1">
                    <View className="items-center w-1/3 px-1"><Icon name="truck-delivery" size={18} color="white" /><Text className="text-[11px] text-white/90 mt-1 text-center font-medium" adjustsFontSizeToFit numberOfLines={1}>{t('home.fastDelivery')}</Text></View>
                    <View className="items-center w-1/3 px-1"><Icon name="shield-check" size={18} color="white" /><Text className="text-[11px] text-white/90 mt-1 text-center font-medium" adjustsFontSizeToFit numberOfLines={1}>{t('home.freshQuality')}</Text></View>
                    <View className="items-center w-1/3 px-1"><Icon name="cash-multiple" size={18} color="white" /><Text className="text-[11px] text-white/90 mt-1 text-center font-medium" adjustsFontSizeToFit numberOfLines={1}>{t('home.bestPrices')}</Text></View>
                </View>

                {selectedCountry && (
                    <View className="bg-white/20 rounded-full px-3 py-1 mb-2 flex-row items-center">
                        <Icon name="map-marker" size={12} color="white" />
                        <Text className="text-xs text-white font-medium ml-1">{t('country.viewing')} {selectedCountry === COUNTRIES.GERMANY ? t('profile.germany') : t('profile.denmark')}</Text>
                    </View>
                )}

                <View className="bg-white/10 rounded-lg px-3 py-1.5 mb-2 w-full border border-white/20">
                    <Text className="text-xs text-white text-center font-medium">{t('home.browseAsGuest')}</Text>
                    <Text className="text-xs text-white/80 text-center">{t('home.signUpToOrder')}</Text>
                </View>

                <View className="flex-row gap-2 w-full">
                    <Button title={t('auth.login') || 'Login'} onPress={() => navigation.navigate('Login')} variant="outline" style={{ flex: 1, backgroundColor: 'white', paddingVertical: 8 }} textStyle={{ color: colors.primary[500] }} />
                    <Button title={t('auth.register') || 'Sign Up'} onPress={() => navigation.navigate('Register')} style={{ flex: 1, backgroundColor: 'white', paddingVertical: 8 }} textStyle={{ color: colors.primary[500] }} />
                </View>
            </View>
        </LinearGradient>
    );
};
