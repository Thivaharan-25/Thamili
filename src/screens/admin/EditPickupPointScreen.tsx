import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { pickupPointService } from '../../services';
import { Input, Button, ErrorMessage, LoadingScreen, CountrySelector, MapPickerModal, SuccessCelebration } from '../../components';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { isTablet, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';

type EditPickupPointScreenRouteProp = RouteProp<RootStackParamList, 'EditPickupPoint'>;
type EditPickupPointScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditPickupPoint'>;

const EditPickupPointScreen = () => {
  const route = useRoute<EditPickupPointScreenRouteProp>();
  const navigation = useNavigation<EditPickupPointScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pickupPointId } = route.params;
  const padding = getResponsivePadding();

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
  const [active, setActive] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch pickup point
  const { data: pickupPoint, isLoading } = useQuery({
    queryKey: ['pickupPoint', pickupPointId],
    queryFn: () => pickupPointService.getPickupPointById(pickupPointId),
    enabled: !!pickupPointId,
  });

  useEffect(() => {
    if (pickupPoint) {
      setName(pickupPoint.name);
      setAddress(pickupPoint.address);
      setLatitude(pickupPoint.latitude?.toString() || '');
      setLongitude(pickupPoint.longitude?.toString() || '');
      setCountry(pickupPoint.country);
      setDeliveryFee(pickupPoint.delivery_fee.toString());
      setBaseDeliveryFee(pickupPoint.base_delivery_fee?.toString() || '');
      setFreeDeliveryRadius(pickupPoint.free_delivery_radius?.toString() || '');
      setExtraKmFee(pickupPoint.extra_km_fee?.toString() || '');
      setWorkingHours(pickupPoint.working_hours || '');
      setContactNumber(pickupPoint.contact_number || '');
      setActive(pickupPoint.active);
    }
  }, [pickupPoint]);

  const hasChanges = useMemo(() => {
    if (!pickupPoint) return false;

    return (
      name.trim() !== pickupPoint.name ||
      address.trim() !== pickupPoint.address ||
      (latitude ? parseFloat(latitude) : undefined) !== (pickupPoint.latitude || undefined) ||
      (longitude ? parseFloat(longitude) : undefined) !== (pickupPoint.longitude || undefined) ||
      country !== pickupPoint.country ||
      parseFloat(deliveryFee || '0') !== pickupPoint.delivery_fee ||
      parseFloat(baseDeliveryFee || '0') !== (pickupPoint.base_delivery_fee || 0) ||
      parseFloat(freeDeliveryRadius || '0') !== (pickupPoint.free_delivery_radius || 0) ||
      parseFloat(extraKmFee || '0') !== (pickupPoint.extra_km_fee || 0) ||
      workingHours.trim() !== (pickupPoint.working_hours || '') ||
      contactNumber.trim() !== (pickupPoint.contact_number || '') ||
      active !== pickupPoint.active
    );
  }, [
    name, address, latitude, longitude, country,
    deliveryFee, baseDeliveryFee, freeDeliveryRadius,
    extraKmFee, workingHours, contactNumber, active,
    pickupPoint
  ]);

  const updateMutation = useMutation({
    mutationFn: (updates: any) => pickupPointService.updatePickupPoint(pickupPointId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickupPoints'] });
      queryClient.invalidateQueries({ queryKey: ['pickupPoint', pickupPointId] });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('admin.pickupPoints.failedToUpdate'));
    },
  });

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = t('admin.pickupPoints.nameRequired');
    if (!address.trim()) newErrors.address = t('admin.pickupPoints.addressRequired');
    if (!deliveryFee || isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0) {
      newErrors.deliveryFee = t('admin.pickupPoints.feeRequired');
    }



    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (!pickupPoint || !hasChanges) return;

    updateMutation.mutate({
      name: name.trim(),
      address: address.trim(),
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      country,
      delivery_fee: parseFloat(deliveryFee),
      base_delivery_fee: baseDeliveryFee ? parseFloat(baseDeliveryFee) : 0,
      free_delivery_radius: freeDeliveryRadius ? parseFloat(freeDeliveryRadius) : 0,
      extra_km_fee: extraKmFee ? parseFloat(extraKmFee) : 0,
      working_hours: workingHours.trim(),
      contact_number: contactNumber.trim(),
      active,
    });
  };

  const handleLocationSelect = (location: any) => {
    if (location.address && !name) {
      setName(location.address.split(',')[0]);
    }
    if (location.address) setAddress(location.address);
    if (location.latitude) setLatitude(location.latitude.toString());
    if (location.longitude) setLongitude(location.longitude.toString());
    setIsMapVisible(false);
  };

  if (isLoading) {
    return <LoadingScreen message={t('admin.pickupPoints.loadingPickupPoint')} />;
  }

  if (!pickupPoint) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={t('admin.pickupPoints.notFound')} />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>{t('admin.pickupPoints.editPickupPoint')}</Text>
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
            <Icon name="map-marker-radius" size={24} color={colors.primary[600]} />
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
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
          />

          <Input
            label={t('admin.pickupPoints.address')}
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
            value={workingHours}
            onChangeText={setWorkingHours}
            leftIcon="clock-outline"
            placeholder={t('admin.pickupPoints.workingHoursPlaceholder')}
          />

          <Input
            label={t('admin.pickupPoints.contactNumber')}
            value={contactNumber}
            onChangeText={setContactNumber}
            leftIcon="phone-outline"
            keyboardType="phone-pad"
            placeholder={t('admin.pickupPoints.contactNumberPlaceholder')}
          />

          <CountrySelector
            selectedCountry={country}
            onSelectCountry={setCountry}
            style={styles.section}
          />

          <Input
            label={t('admin.pickupPoints.standardPickupFee')}
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
            placeholder={t('admin.pickupPoints.baseFeePlaceholder')}
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
                placeholder={t('admin.pickupPoints.radiusPlaceholder')}
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
                placeholder={t('admin.pickupPoints.extraFeePlaceholder')}
                value={extraKmFee}
                onChangeText={setExtraKmFee}
                keyboardType="decimal-pad"
                leftIcon="plus-circle-outline"
                helperText={t('admin.pickupPoints.extraKmFeeHelper')}
              />
            </View>
          </View>

          <View style={styles.divider} />



          <View style={styles.activeSection}>
            <Text style={styles.label}>{t('admin.pickupPoints.status')}</Text>
            <TouchableOpacity
              style={[styles.activeButton, active && styles.activeButtonActive]}
              onPress={() => setActive(!active)}
              activeOpacity={0.8}
            >
              <View style={[styles.activeIcon, active ? styles.activeIconActive : styles.activeIconInactive]}>
                <Icon
                  name={active ? 'check' : 'close'}
                  size={16}
                  color={active ? colors.success[600] : colors.neutral[500]}
                />
              </View>
              <View>
                <Text style={[styles.activeText, active && styles.activeTextActive]}>
                  {active ? t('admin.pickupPoints.activeLocation') : t('admin.pickupPoints.inactiveLocation')}
                </Text>
                <Text style={styles.activeSubtext}>
                  {active ? t('admin.pickupPoints.visibleToCustomers') : t('admin.pickupPoints.hiddenFromCustomers')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Button
            title={t('admin.pickupPoints.updatePickupPoint')}
            onPress={handleSubmit}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending || !hasChanges}
            fullWidth
            style={[styles.submitButton, !hasChanges && styles.disabledButton]}
            variant="primary"
          />
        </View>
      </ScrollView >

      <MapPickerModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        onSelect={handleLocationSelect}
        country={country === COUNTRIES.DENMARK ? 'denmark' : 'germany'}
        initialLatitude={parseFloat(latitude) || undefined}
        initialLongitude={parseFloat(longitude) || undefined}
      />

      <SuccessCelebration
        visible={showSuccessModal}
        message={t('admin.pickupPoints.updatedSuccess')}
        onComplete={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View >
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
  section: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  activeSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    gap: 16,
  },
  activeButtonActive: {
    borderColor: colors.success[200],
    backgroundColor: colors.success[50],
  },
  activeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeIconActive: {
    backgroundColor: colors.success[100],
    borderColor: colors.success[300],
  },
  activeIconInactive: {
    backgroundColor: colors.neutral[200],
    borderColor: colors.neutral[300],
  },
  activeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  activeTextActive: {
    color: colors.success[800],
  },
  activeSubtext: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  mapButton: {
    marginBottom: 20,
    borderColor: colors.primary[600],
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default EditPickupPointScreen;
