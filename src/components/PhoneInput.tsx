/**
 * Phone Input Component with Custom Country Selector
 * Only supports Germany, Denmark, and Sri Lanka
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import Input from './Input';

interface Country {
  code: string;
  dial_code: string;
  flag: string;
  name: string;
  maxLength: number;
}

const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'DE', dial_code: '+49', flag: '🇩🇪', name: 'Germany', maxLength: 11 },
  { code: 'DK', dial_code: '+45', flag: '🇩🇰', name: 'Denmark', maxLength: 8 },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onChangeFormattedText?: (text: string) => void;
  onChangeCountry?: (country: any) => void;
  error?: string;
  containerStyle?: any;
  editable?: boolean;
  defaultCode?: string; // e.g., 'DE' for Germany, 'DK' for Denmark
  placeholder?: string;
  leftIcon?: string;
  allowedCountries?: string[]; // Kept for prop compatibility, but ignored in this custom version
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  onChangeFormattedText,
  onChangeCountry,
  error,
  containerStyle,
  editable = true,
  defaultCode = 'DE',
  placeholder = 'Enter phone number',
  leftIcon = 'phone-outline',
}) => {
  const [show, setShow] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    SUPPORTED_COUNTRIES.find(c => c.code === defaultCode) || SUPPORTED_COUNTRIES[0]
  );

  // Update selected country if defaultCode changes
  useEffect(() => {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === defaultCode);
    if (country) {
      setSelectedCountry(country);
    }
  }, [defaultCode]);

  const handlePhoneChange = (text: string) => {
    // Clean input to digits only
    const cleaned = text.replace(/[^0-9]/g, '');

    // Enforce maxLength
    if (cleaned.length > selectedCountry.maxLength) {
      return;
    }

    onChangeText(cleaned);

    if (onChangeFormattedText) {
      onChangeFormattedText(selectedCountry.dial_code + cleaned);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShow(false);

    if (onChangeCountry) {
      onChangeCountry(country);
    }

    if (onChangeFormattedText) {
      onChangeFormattedText(country.dial_code + value);
    }
  };

  const CountryTrigger = () => (
    <TouchableOpacity
      onPress={() => editable && setShow(true)}
      style={styles.countryPickerTrigger}
      disabled={!editable}
    >
      <Text style={styles.flagText}>{selectedCountry.flag}</Text>
      <Text style={styles.dialCodeText}>{selectedCountry.dial_code}</Text>
      <Icon name="chevron-down" size={16} color={colors.neutral[500]} />
      <View style={styles.divider} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Input
        value={value}
        onChangeText={handlePhoneChange}
        placeholder={placeholder}
        keyboardType="phone-pad"
        error={error}
        editable={editable}
        leftIcon={<CountryTrigger />}
        innerContainerStyle={{ paddingLeft: 100 }}
        containerStyle={styles.inputContainer}
      />

      <Modal
        visible={show}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShow(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShow(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <FlatList
                  data={SUPPORTED_COUNTRIES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        selectedCountry.code === item.code && styles.selectedCountryItem
                      ]}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <Text style={styles.itemFlag}>{item.flag}</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDialCode}>{item.dial_code}</Text>
                      {selectedCountry.code === item.code && (
                        <Icon name="check" size={20} color={colors.primary[500]} />
                      )}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 0,
  },
  countryPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    height: '100%',
  },
  flagText: {
    fontSize: 20,
    marginRight: 4,
  },
  dialCodeText: {
    fontSize: 16,
    color: colors.neutral[900],
    fontWeight: '500',
    marginRight: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(58, 181, 209, 0.2)',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 16,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectedCountryItem: {
    backgroundColor: colors.primary[50],
  },
  itemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    color: colors.neutral[900],
    flex: 1,
  },
  itemDialCode: {
    fontSize: 14,
    color: colors.neutral[500],
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
});

export default PhoneInput;


