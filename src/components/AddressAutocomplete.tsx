/**
 * Address Autocomplete Component
 * Provides address suggestions (simplified version - can be enhanced with Google Places API)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface AddressSuggestion {
  id: string;
  address: string;
  city: string;
  postalCode: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  style?: any;
}

// Mock address suggestions (in production, use Google Places API or similar)
const generateSuggestions = (query: string): AddressSuggestion[] => {
  if (!query || query.length < 3) return [];
  
  const mockAddresses: AddressSuggestion[] = [
    { id: '1', address: 'Hauptstraße 123', city: 'Berlin', postalCode: '10115' },
    { id: '2', address: 'Musterstraße 45', city: 'Berlin', postalCode: '10115' },
    { id: '3', address: 'Bahnhofstraße 78', city: 'Berlin', postalCode: '10117' },
    { id: '4', address: 'Friedrichstraße 12', city: 'Berlin', postalCode: '10117' },
    { id: '5', address: 'Unter den Linden 1', city: 'Berlin', postalCode: '10117' },
  ];

  const lowerQuery = query.toLowerCase();
  return mockAddresses
    .filter(
      (addr) =>
        addr.address.toLowerCase().includes(lowerQuery) ||
        addr.city.toLowerCase().includes(lowerQuery) ||
        addr.postalCode.includes(query)
    )
    .slice(0, 5);
};

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder = 'Enter address',
  style,
}) => {
  const { colors: themeColors } = useTheme();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0 && value.length >= 3);
  }, [value]);

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    onChangeText(suggestion.address);
    onSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer, { borderColor: themeColors.border.default }]}>
        <Icon name="map-marker" size={20} color={themeColors.primary[500]} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.text.primary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.text.tertiary}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            // Delay to allow suggestion selection
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          accessibilityLabel="Address input with autocomplete"
          accessibilityHint="Start typing to see address suggestions"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              setShowSuggestions(false);
            }}
            accessibilityLabel="Clear address"
            accessibilityRole="button"
          >
            <Icon name="close-circle" size={20} color={themeColors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View 
          style={[styles.suggestionsContainer, { backgroundColor: themeColors.background.card }]}
          pointerEvents="box-none"
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
                accessibilityLabel={`Select address: ${item.address}`}
                accessibilityRole="button"
              >
                <Icon name="map-marker-outline" size={18} color={themeColors.primary[500]} />
                <View style={styles.suggestionContent}>
                  <Text style={[styles.suggestionAddress, { color: themeColors.text.primary }]}>
                    {item.address}
                  </Text>
                  <Text style={[styles.suggestionDetails, { color: themeColors.text.secondary }]}>
                    {item.postalCode} {item.city}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            nestedScrollEnabled={true}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionAddress: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionDetails: {
    fontSize: 13,
  },
});

export default AddressAutocomplete;

