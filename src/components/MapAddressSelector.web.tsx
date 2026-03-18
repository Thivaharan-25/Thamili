
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
// We do NOT import react-native-maps here as it causes web bundling errors
import * as Location from 'expo-location';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { Button } from 'react-native-paper';
import { getResponsiveFontSize } from '../utils/responsive';

// Using a type alias to avoid importing Region from react-native-maps
type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

interface MapAddressSelectorProps {
    onLocationSelect: (location: { latitude: number; longitude: number }) => void;
    initialRegion?: Region;
    readOnly?: boolean;
}

const DEFAULT_REGION: Region = {
    latitude: 51.1657, // Germany center
    longitude: 10.4515,
    latitudeDelta: 5.0,
    longitudeDelta: 5.0,
};

const MapAddressSelector: React.FC<MapAddressSelectorProps> = ({
    onLocationSelect,
    initialRegion,
    readOnly = false,
}) => {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
        initialRegion ? { latitude: initialRegion.latitude, longitude: initialRegion.longitude } : null
    );

    const getCurrentLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            setSelectedLocation(coords);
            onLocationSelect(coords);
        } catch (error) {
            setErrorMsg('Could not fetch location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.webFallbackContainer}>
                <Icon name="map-outline" size={60} color={colors.neutral[300]} />
                <Text style={styles.webFallbackTitle}>Map Preview (Mobile Only)</Text>
                <Text style={styles.webFallbackText}>
                    Interactive map selection is optimized for the mobile app.
                    {selectedLocation ? `\nSelected: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}` : ''}
                </Text>

                {!readOnly && (
                    <Button
                        mode="contained"
                        onPress={getCurrentLocation}
                        style={styles.locationButton}
                        loading={loading}
                        disabled={loading}
                        theme={{ colors: { primary: colors.primary[500] } }}
                    >
                        {selectedLocation ? 'Update Current Location' : 'Use Current Location'}
                    </Button>
                )}

                {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            </View>

            {!readOnly && !selectedLocation && !loading && (
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>Please allow location access to select your delivery point</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 300,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 10,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        borderStyle: 'dashed',
    },
    webFallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    webFallbackTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.neutral[600],
        marginTop: 12,
    },
    webFallbackText: {
        fontSize: 14,
        color: colors.neutral[500],
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
        lineHeight: 20,
    },
    locationButton: {
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    errorText: {
        marginTop: 12,
        color: colors.error[500],
        fontSize: 12,
    },
    instructionContainer: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    instructionText: {
        textAlign: 'center',
        fontSize: getResponsiveFontSize(12),
        color: colors.neutral[500],
    }
});

export default MapAddressSelector;
