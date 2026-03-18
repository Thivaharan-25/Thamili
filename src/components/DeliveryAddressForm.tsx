import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Input from './Input';
import { MapPickerModal } from './MapPickerModal';
import AddressAutocomplete from './AddressAutocomplete';
import { formatPhoneNumber, validatePostalCode } from '../utils/regionalFormatting';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface DeliveryAddressFormProps {
  street: string;
  city: string;
  postalCode: string;
  phone?: string;
  instructions: string;
  onStreetChange: (text: string) => void;
  onCityChange: (text: string) => void;
  onPostalCodeChange: (text: string) => void;
  onPhoneChange?: (text: string) => void;
  onInstructionsChange: (text: string) => void;
  onLocationChange?: (location: { latitude: number; longitude: number; address?: string; city?: string; postalCode?: string }) => void;
  errors?: Record<string, string>;
  style?: any;
  country?: Country;
}

const DeliveryAddressForm: React.FC<DeliveryAddressFormProps> = ({
  street,
  city,
  postalCode,
  phone,
  instructions,
  onStreetChange,
  onCityChange,
  onPostalCodeChange,
  onPhoneChange,
  onInstructionsChange,
  onLocationChange,
  errors = {},
  style,
  country = COUNTRIES.GERMANY as any,
}) => {
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [pinnedAddress, setPinnedAddress] = useState<string | null>(null);

  // Refs for keyboard navigation
  const cityRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const instructionsRef = useRef<TextInput>(null);

  // Validate postal code as user types
  const handlePostalCodeChange = (text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '');
    onPostalCodeChange(digits);
    // Validation will be handled by parent component via errors prop
  };

  const postalCodePlaceholder = country === COUNTRIES.GERMANY
    ? '12345'
    : '1234';
  const postalCodeMaxLength = country === COUNTRIES.GERMANY ? 5 : 4;

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel="Delivery address form"
    >
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        Delivery Address
      </Text>

      {/* Map Selector — opens full-screen modal for easy panning */}
      {onLocationChange && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.label, { color: '#666', fontSize: 14, marginBottom: 8 }]}>
            Pin Location on Map
          </Text>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setMapModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="map-marker" size={20} color="#4CAF50" />
            <Text style={styles.mapButtonText}>
              {pinnedAddress ?? 'Tap to pin location on map'}
            </Text>
            <Icon name="fullscreen" size={20} color="#666" />
          </TouchableOpacity>

          <MapPickerModal
            visible={mapModalVisible}
            onClose={() => setMapModalVisible(false)}
            country={country === 'denmark' ? 'denmark' : 'germany'}
            onSelect={(loc) => {
              setMapModalVisible(false);
              setPinnedAddress(loc.address ?? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
              onLocationChange(loc);
            }}
          />
        </View>
      )}

      <View style={{ marginBottom: 8 }}>
        <Text style={[styles.label, { color: '#666', fontSize: 14, marginBottom: 8 }]}>
          Street Address
        </Text>
        <AddressAutocomplete
          value={street}
          onChangeText={onStreetChange}
          onSelectSuggestion={(suggestion) => {
            onStreetChange(suggestion.address);
            onCityChange(suggestion.city);
            onPostalCodeChange(suggestion.postalCode);
          }}
          placeholder="Enter street address"
        />
      </View>
      {errors.street && (
        <Text style={{ color: '#F44336', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
          {errors.street}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Input
            ref={cityRef}
            label="City"
            placeholder="Enter city"
            value={city}
            onChangeText={onCityChange}
            error={errors.city}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => postalCodeRef.current?.focus()}
            accessibilityLabel="City input"
            accessibilityHint="Enter your city name"
          />
        </View>
        <View style={styles.halfWidth}>
          <Input
            ref={postalCodeRef}
            label="Postal Code"
            placeholder={postalCodePlaceholder}
            value={postalCode}
            onChangeText={handlePostalCodeChange}
            error={errors.postalCode}
            keyboardType="number-pad"
            maxLength={postalCodeMaxLength}
            returnKeyType="next"
            onSubmitEditing={() => instructionsRef.current?.focus()}
            accessibilityLabel={`Postal code input for ${country === COUNTRIES.GERMANY ? 'Germany' : 'Denmark'}`}
            accessibilityHint={`Enter ${postalCodeMaxLength} digit postal code`}
          />
        </View>
      </View>

      {onPhoneChange && (
        <Input
          label="Phone Number"
          placeholder="Enter phone number"
          value={phone || ''}
          onChangeText={onPhoneChange}
          error={errors.phone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      )}

      <Input
        ref={instructionsRef}
        label="Delivery Instructions (Optional)"
        placeholder="Any special delivery instructions?"
        value={instructions}
        onChangeText={onInstructionsChange}
        error={errors.instructions}
        multiline
        numberOfLines={3}
        returnKeyType="done"
        blurOnSubmit={true}
        style={styles.textArea}
        accessibilityLabel="Delivery instructions input"
        accessibilityHint="Enter any special delivery instructions (optional)"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mapButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
  },
});

export default DeliveryAddressForm;

