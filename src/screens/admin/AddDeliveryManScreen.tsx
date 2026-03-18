import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore'; // Correct import path
import { colors } from '../../theme';
import { AnimatedView, ErrorMessage, CountrySelector, SuccessCelebration } from '../../components';
import { getResponsivePadding } from '../../utils/responsive';
import { Country, COUNTRIES } from '../../constants';

const COUNTRY_PHONE_CODES = {
    [COUNTRIES.GERMANY]: '+49',
    [COUNTRIES.DENMARK]: '+45',

};

const PHONE_LENGTHS = {
    [COUNTRIES.GERMANY]: 11,
    [COUNTRIES.DENMARK]: 8,
};

const PHONE_REGEX = {
    [COUNTRIES.GERMANY]: /^\d{10,11}$/, // 10 or 11 digits
    [COUNTRIES.DENMARK]: /^\d{8}$/,      // Exactly 8 digits
};

const AddDeliveryManScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'AddDeliveryMan'>>();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const padding = getResponsivePadding();
    const { createDeliveryPartner, updateDeliveryPartner, isLoading } = useAuthStore();

    const editingUser = route.params?.deliveryMan;
    const isEditing = !!editingUser;

    const [username, setUsername] = useState(editingUser?.name || editingUser?.username || '');
    const [country, setCountry] = useState<Country>(editingUser?.country_preference || COUNTRIES.GERMANY);
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (editingUser?.phone) {
            const prefix = COUNTRY_PHONE_CODES[country as keyof typeof COUNTRY_PHONE_CODES];
            const digits = editingUser.phone.replace(/\D/g, '');
            const prefixDigits = prefix.replace(/\D/g, '');
            if (digits.startsWith(prefixDigits)) {
                setPhone(digits.substring(prefixDigits.length));
            } else {
                setPhone(digits);
            }
        }
    }, [editingUser, country]);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [apiError, setApiError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleCountryChange = (newCountry: Country) => {
        setCountry(newCountry);
        setPhoneError('');
    };

    const validatePhoneNumber = (text: string, currentCountry: Country) => {
        const prefix = COUNTRY_PHONE_CODES[currentCountry as keyof typeof COUNTRY_PHONE_CODES];
        if (!prefix) return false;

        const numberPart = text.replace(prefix, '').trim();
        const regex = PHONE_REGEX[currentCountry as keyof typeof PHONE_REGEX] || /^\d{8,}$/;

        if (!regex.test(numberPart)) {
            if (currentCountry === COUNTRIES.GERMANY) {
                setPhoneError(t('admin.managePartners.phoneGermanyHint'));
            } else if (currentCountry === COUNTRIES.DENMARK) {
                setPhoneError(t('admin.managePartners.phoneDenmarkHint'));
            } else {
                setPhoneError(t('admin.managePartners.invalidPhone'));
            }
            return false;
        }

        setPhoneError('');
        return true;
    };

    const handlePhoneChange = (text: string) => {
        const digits = text.replace(/\D/g, '');
        const maxLength = PHONE_LENGTHS[country as keyof typeof PHONE_LENGTHS] || 15;

        // Enforce max length (subscriber part)
        if (digits.length > maxLength) {
            return;
        }

        setPhone(digits);
        if (phoneError) setPhoneError('');
    };

    const handleCreate = async () => {
        setApiError('');
        setPhoneError('');

        if (!username.trim() || !phone.trim() || (!isEditing && !password.trim())) {
            setApiError(t('admin.managePartners.allFieldsRequired'));
            return;
        }

        const prefix = COUNTRY_PHONE_CODES[country as keyof typeof COUNTRY_PHONE_CODES];
        const fullPhone = `${prefix}${phone}`;

        if (!validatePhoneNumber(fullPhone, country)) {
            return;
        }

        if (!isEditing && password.length < 6) {
            setApiError(t('admin.managePartners.passwordTooShort'));
            return;
        }

        let result;
        if (isEditing && editingUser) {
            result = await updateDeliveryPartner(editingUser.id, {
                name: username,
                phone: fullPhone,
                country_preference: country
            });
        } else {
            result = await createDeliveryPartner(username, password, fullPhone, country);
        }

        if (result.success) {
            setShowSuccess(true);
        } else {
            setApiError(result.error || (isEditing ? t('admin.managePartners.failedToUpdate') : t('admin.managePartners.failedToCreate')));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={styles.headerContainer}>
                <ExpoLinearGradient
                    colors={[colors.navy[900], colors.navy[700]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
                >
                    <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? t('admin.managePartners.editTitle') : t('admin.managePartners.addTitle')}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </ExpoLinearGradient>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ padding: padding.horizontal, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <AnimatedView animation="fade" delay={200} style={styles.formCard}>

                        {apiError ? (
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
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('admin.managePartners.username')}</Text>
                            <View style={styles.inputContainer}>
                                <Icon name="account" size={20} color={colors.neutral[400]} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('admin.managePartners.usernamePlaceholder')}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.neutral[400]}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <CountrySelector
                                selectedCountry={country}
                                onSelectCountry={handleCountryChange}
                                compact={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('admin.managePartners.phone')}</Text>
                            <View style={styles.inputContainer}>
                                <Icon name="phone" size={20} color={colors.neutral[400]} style={styles.inputIcon} />
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, color: colors.neutral[900], fontWeight: '600' }}>
                                        {COUNTRY_PHONE_CODES[country as keyof typeof COUNTRY_PHONE_CODES]}
                                    </Text>
                                    <View style={{ width: 1, height: 20, backgroundColor: colors.neutral[200], marginHorizontal: 10 }} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder={country === COUNTRIES.GERMANY
                                        ? t('admin.managePartners.phonePlaceholderGE')
                                        : t('admin.managePartners.phonePlaceholderDK')}
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                    onBlur={() => {
                                        const prefix = COUNTRY_PHONE_CODES[country as keyof typeof COUNTRY_PHONE_CODES];
                                        validatePhoneNumber(`${prefix}${phone}`, country);
                                    }}
                                    keyboardType="phone-pad"
                                    placeholderTextColor={colors.neutral[400]}
                                />
                            </View>
                            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                        </View>



                        {!isEditing && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('admin.managePartners.password')}</Text>
                                <View style={styles.inputContainer}>
                                    <Icon name="lock" size={20} color={colors.neutral[400]} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('admin.managePartners.passwordPlaceholder')}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        placeholderTextColor={colors.neutral[400]}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                        <Icon name={showPassword ? "eye-off" : "eye"} size={20} color={colors.neutral[400]} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}



                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                            onPress={handleCreate}
                            disabled={isLoading}
                        >

                            <Text style={styles.submitButtonText}>
                                {isLoading
                                    ? (isEditing ? t('admin.managePartners.updating') : t('admin.managePartners.creating'))
                                    : (isEditing ? t('admin.managePartners.updateAction') : t('admin.managePartners.createAction'))}
                            </Text>
                        </TouchableOpacity>

                    </AnimatedView>
                </ScrollView>
            </KeyboardAvoidingView>

            <SuccessCelebration
                visible={showSuccess}
                message={isEditing ? t('admin.managePartners.updatedSuccess') : t('admin.managePartners.createdSuccess')}
                onComplete={() => {
                    setShowSuccess(false);
                    navigation.goBack();
                }}
            />
        </View >
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
        paddingBottom: 24,
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
        marginTop: 20,
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.navy[900],
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[50], // Slightly gray background for inputs
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        height: 50, // Fixed height for consistency
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.neutral[900],
        height: '100%',
    },
    eyeIcon: {
        padding: 8,
    },
    submitButton: {
        backgroundColor: colors.primary[500],
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    submitButtonDisabled: {
        backgroundColor: colors.neutral[300],
        shadowOpacity: 0,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
    helperText: {
        fontSize: 12,
        color: colors.neutral[500],
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        fontSize: 12,
        color: colors.error[500] || '#EF4444',
        marginTop: 4,
        marginLeft: 4,
    },
});

export default AddDeliveryManScreen;
