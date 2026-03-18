import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { pickupPointService } from '../../services';
import { Input, Button, ErrorMessage, CountrySelector, MapPickerModal, SuccessCelebration } from '../../components';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { isTablet, isSmallDevice, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type AddPickupPointScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddPickupPoint'>;

const AddPickupPointScreen = () => {
  const navigation = useNavigation<AddPickupPointScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const padding = getResponsivePadding();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES.GERMANY);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [baseDeliveryFee, setBaseDeliveryFee] = useState('');
  const [freeDeliveryRadius, setFreeDeliveryRadius] = useState('');
  const [extraKmFee, setExtraKmFee] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (pickupPointData: any) => pickupPointService.createPickupPoint(pickupPointData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickupPoints'] });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('admin.pickupPoints.failedToCreate'));
    },
  });

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = t('admin.pickupPoints.nameRequired');
    if (!address.trim()) newErrors.address = t('admin.pickupPoints.addressRequired');
    if (!deliveryFee || isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0) {
      newErrors.deliveryFee = t('admin.pickupPoints.feeRequired');
    }

    // Validate coordinates if provided
    if (latitude && (isNaN(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90)) {
      newErrors.latitude = t('admin.pickupPoints.latitudeRequired');
    }
    if (longitude && (isNaN(parseFloat(longitude)) || parseFloat(longitude) < -180 || parseFloat(longitude) > 180)) {
      newErrors.longitude = t('admin.pickupPoints.longitudeRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    createMutation.mutate({
      name: name.trim(),
      address: address.trim(),
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      country,
      delivery_fee: parseFloat(deliveryFee),
      base_delivery_fee: baseDeliveryFee ? parseFloat(baseDeliveryFee) : 0,
      free_delivery_radius: freeDeliveryRadius ? parseFloat(freeDeliveryRadius) : 0,
      extra_km_fee: extraKmFee ? parseFloat(extraKmFee) : 0,
      active: true,
      working_hours: workingHours.trim(),
      contact_number: contactNumber.trim(),
      admin_id: user?.id,
    });
  };

  const handleLocationSelect = (location: any) => {
    if (location.address && !name) {
      // Use the first part of address as name if name is empty
      setName(location.address.split(',')[0]);
    }
    if (location.address) setAddress(location.address);
    if (location.latitude) setLatitude(location.latitude.toString());
    if (location.longitude) setLongitude(location.longitude.toString());
    setIsMapVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <ExpoLinearGradient
        colors={[colors.navy[800], colors.navy[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Icon
            name="arrow-left"
            size={24}
            color={colors.white}
            onPress={() => navigation.goBack()}
            suppressHighlighting
          />
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('admin.pickupPoints.addPickupPoint')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </ExpoLinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: padding.vertical * 2,
          paddingHorizontal: padding.horizontal,
          maxWidth: isTablet() ? 600 : '100%',
          alignSelf: isTablet() ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Icon name="map-marker-plus" size={24} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>{t('admin.pickupPoints.details')}</Text>
          </View>

          {Object.keys(errors).length > 0 && (
            <ErrorMessage
              message={t('admin.pickupPoints.fixErrors')}
              type="error"
              style={styles.errorMessage}
            />
          )}

          <Button
            title={t('admin.pickupPoints.pickFromMap')}
            onPress={() => setIsMapVisible(true)}
            variant="outline"
            icon={<Icon name="map-search-outline" size={20} color={colors.primary[600]} />}
            style={styles.mapButton}
          />

          <Input
            label={t('admin.pickupPoints.name')}
            placeholder={t('admin.pickupPoints.namePlaceholder')}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
          />

          <Input
            label={t('admin.pickupPoints.address')}
            placeholder={t('admin.pickupPoints.addressPlaceholder')}
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              if (errors.address) setErrors({ ...errors, address: '' });
            }}
            error={errors.address}
            multiline
            numberOfLines={2}
          />

          <Input
            label={t('admin.pickupPoints.workingHours')}
            placeholder="e.g. Mon - Sat: 9 AM - 8 PM"
            value={workingHours}
            onChangeText={setWorkingHours}
            leftIcon="clock-outline"
          />

          <Input
            label={t('admin.pickupPoints.contactNumber')}
            placeholder="e.g. +49 123 456789"
            value={contactNumber}
            onChangeText={setContactNumber}
            leftIcon="phone-outline"
            keyboardType="phone-pad"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <CountrySelector
                selectedCountry={country}
                onSelectCountry={setCountry}
                style={styles.countrySelector}
              />
            </View>
          </View>

          <Input
            label={t('admin.pickupPoints.standardPickupFee')}
            placeholder="0.00"
            value={deliveryFee}
            onChangeText={(text) => {
              setDeliveryFee(text);
              if (errors.deliveryFee) setErrors({ ...errors, deliveryFee: '' });
            }}
            keyboardType="decimal-pad"
            error={errors.deliveryFee}
            leftIcon="currency-eur"
            helperText={t('admin.pickupPoints.pickupFeeHelper')}
          />

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Icon name="truck-delivery" size={24} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>{t('admin.pickupPoints.homeDeliverySettings')}</Text>
          </View>

          <Input
            label={t('admin.pickupPoints.baseHomeDeliveryFee')}
            placeholder="e.g. 3.00"
            value={baseDeliveryFee}
            onChangeText={setBaseDeliveryFee}
            keyboardType="decimal-pad"
            leftIcon="home-outline"
            helperText={t('admin.pickupPoints.baseFeeHelper')}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('admin.pickupPoints.freeDeliveryRadius')}
                placeholder="e.g. 2"
                value={freeDeliveryRadius}
                onChangeText={setFreeDeliveryRadius}
                keyboardType="decimal-pad"
                leftIcon="map-marker-distance"
                helperText={t('admin.pickupPoints.freeRadiusHelper')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('admin.pickupPoints.extraKmFee')}
                placeholder="e.g. 1.00"
                value={extraKmFee}
                onChangeText={setExtraKmFee}
                keyboardType="decimal-pad"
                leftIcon="plus-circle-outline"
                helperText={t('admin.pickupPoints.extraKmFeeHelper')}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Icon name="crosshairs-gps" size={24} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>{t('admin.pickupPoints.coordinates')}</Text>
          </View>

          <Text style={styles.helperText}>{t('admin.pickupPoints.coordinatesHelper')}</Text>

          <View style={styles.coordinatesRow}>
            <View style={styles.halfWidth}>
              <Input
                label={t('common.latitude')}
                placeholder={t('admin.pickupPoints.latitudePlaceholder')}
                value={latitude}
                onChangeText={(text) => {
                  setLatitude(text);
                  if (errors.latitude) setErrors({ ...errors, latitude: '' });
                }}
                keyboardType="decimal-pad"
                error={errors.latitude}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label={t('common.longitude')}
                placeholder={t('admin.pickupPoints.longitudePlaceholder')}
                value={longitude}
                onChangeText={(text) => {
                  setLongitude(text);
                  if (errors.longitude) setErrors({ ...errors, longitude: '' });
                }}
                keyboardType="decimal-pad"
                error={errors.longitude}
              />
            </View>
          </View>

          <Button
            title={t('admin.pickupPoints.addPickupPoint')}
            onPress={handleSubmit}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            fullWidth
            style={styles.submitButton}
            variant="primary"
          />
        </View>
      </ScrollView>

      <MapPickerModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        onSelect={handleLocationSelect}
        country={country === COUNTRIES.DENMARK ? 'denmark' : 'germany'}
      />

      <SuccessCelebration
        visible={showSuccessModal}
        message={t('admin.pickupPoints.createdSuccess')}
        onComplete={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: -20,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingTop: 30,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy[800],
  },
  errorMessage: {
    marginBottom: 16,
  },
  countrySelector: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: 24,
  },
  helperText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 16,
    marginTop: -10,
  },
  coordinatesRow: {
    flexDirection: isSmallDevice() ? 'column' : 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  mapButton: {
    marginBottom: 20,
    borderColor: colors.primary[600],
  },
});

export default AddPickupPointScreen;
