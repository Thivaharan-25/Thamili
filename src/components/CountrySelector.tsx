import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface CountrySelectorProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  style?: any;
  compact?: boolean;
  transparent?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  style,
  compact,
  transparent,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {!compact && <Text style={styles.label}>{t('profile.countryPreference')}</Text>}
      <View style={[styles.options, compact && styles.optionsCompact]}>
        <TouchableOpacity
          style={[
            styles.option,
            selectedCountry === COUNTRIES.GERMANY && styles.optionActive,
            compact && styles.optionCompact,
            transparent && styles.optionTransparent,
          ]}
          onPress={() => onSelectCountry(COUNTRIES.GERMANY)}
        >
          <Icon
            name="flag"
            size={compact ? 20 : 24}
            color={selectedCountry === COUNTRIES.GERMANY ? '#007AFF' : '#666'}
          />
          {!compact && (
            <Text
              style={[
                styles.optionText,
                selectedCountry === COUNTRIES.GERMANY && styles.optionTextActive,
              ]}
            >
              {t('profile.germany')}
            </Text>
          )}
          {(selectedCountry === COUNTRIES.GERMANY && !compact) && (
            <Icon name="check-circle" size={20} color="#007AFF" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            selectedCountry === COUNTRIES.DENMARK && styles.optionActive,
            compact && styles.optionCompact,
            transparent && styles.optionTransparent,
          ]}
          onPress={() => onSelectCountry(COUNTRIES.DENMARK)}
        >
          <Icon
            name="flag"
            size={compact ? 20 : 24}
            color={selectedCountry === COUNTRIES.DENMARK ? '#007AFF' : '#666'}
          />
          {!compact && (
            <Text
              style={[
                styles.optionText,
                selectedCountry === COUNTRIES.DENMARK && styles.optionTextActive,
              ]}
            >
              {t('profile.denmark')}
            </Text>
          )}
          {(selectedCountry === COUNTRIES.DENMARK && !compact) && (
            <Icon name="check-circle" size={20} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  containerCompact: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  options: {
    gap: 12,
  },
  optionsCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 12,
  },
  optionCompact: {
    padding: 8,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  optionTransparent: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  optionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  optionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default CountrySelector;

