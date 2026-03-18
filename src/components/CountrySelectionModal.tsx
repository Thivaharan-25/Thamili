import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface CountrySelectionModalProps {
  visible: boolean;
  selectedCountry: Country | null;
  onSelectCountry: (country: Country) => void;
}

const CountrySelectionModal: React.FC<CountrySelectionModalProps> = ({
  visible,
  selectedCountry,
  onSelectCountry,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { }} // Prevent closing without selection
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Icon name="earth" size={48} color="#007AFF" />
            <Text style={styles.title}>
              {t('country.selectCountry') || 'Select Your Country'}
            </Text>
            <Text style={styles.subtitle}>
              {t('country.selectCountryDescription') || 'Choose your country to see products and prices'}
            </Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                selectedCountry === COUNTRIES.GERMANY && styles.optionActive,
              ]}
              onPress={() => onSelectCountry(COUNTRIES.GERMANY)}
            >
              <View style={styles.optionContent}>
                <Icon
                  name="flag"
                  size={32}
                  color={selectedCountry === COUNTRIES.GERMANY ? '#007AFF' : '#666'}
                />
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionText,
                      selectedCountry === COUNTRIES.GERMANY && styles.optionTextActive,
                    ]}
                  >
                    {t('profile.germany') || 'Germany'}
                  </Text>
                  <Text style={styles.optionSubtext}>
                    {t('country.germanyDescription') || 'Products and prices for Germany'}
                  </Text>
                </View>
                {selectedCountry === COUNTRIES.GERMANY && (
                  <Icon name="check-circle" size={24} color="#007AFF" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedCountry === COUNTRIES.DENMARK && styles.optionActive,
              ]}
              onPress={() => onSelectCountry(COUNTRIES.DENMARK)}
            >
              <View style={styles.optionContent}>
                <Icon
                  name="flag"
                  size={32}
                  color={selectedCountry === COUNTRIES.DENMARK ? '#007AFF' : '#666'}
                />
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionText,
                      selectedCountry === COUNTRIES.DENMARK && styles.optionTextActive,
                    ]}
                  >
                    {t('profile.denmark') || 'Denmark'}
                  </Text>
                  <Text style={styles.optionSubtext}>
                    {t('country.denmarkDescription') || 'Products and prices for Denmark'}
                  </Text>
                </View>
                {selectedCountry === COUNTRIES.DENMARK && (
                  <Icon name="check-circle" size={24} color="#007AFF" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {selectedCountry && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                // Country is already selected, modal will close automatically
                // The onSelectCountry callback handles the state update
              }}
            >
              <Text style={styles.continueButtonText}>
                {t('common.continue') || 'Continue'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  options: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
  },
  optionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  optionTextActive: {
    color: '#007AFF',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#999',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CountrySelectionModal;

