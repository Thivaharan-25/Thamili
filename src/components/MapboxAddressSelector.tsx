/**
 * Mapbox Address Selector Component
 * Replaces Google Maps with Mapbox GL for global location support
 *
 * NOTE: This component does NOT geocode. It only renders the map and lets the
 * user pan/tap to a location. The parent (MapPickerModal) calls getCenter()
 * and runs reverse-geocoding only when the user presses "Confirm Location".
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { Button } from 'react-native-paper';
import { getResponsiveFontSize } from '../utils/responsive';
import { ENV } from '../config/env';

// Set Mapbox access token
Mapbox.setAccessToken(ENV.MAPBOX_PUBLIC_KEY || '');

export interface MapboxAddressSelectorHandle {
    getCenter: () => Promise<[number, number] | null>;
}

interface MapboxAddressSelectorProps {
    initialLatitude?: number;
    initialLongitude?: number;
    readOnly?: boolean;
    country?: 'germany' | 'denmark';
    /** @deprecated Not used — geocoding happens in MapPickerModal on Confirm */
    onLocationSelect?: (location: { latitude: number; longitude: number; address?: string; city?: string; postalCode?: string }) => void;
}

const DEFAULT_GERMANY = {
    latitude: 51.1657,
    longitude: 10.4515,
    zoom: 5,
};

const DEFAULT_DENMARK = {
    latitude: 56.2639,
    longitude: 9.5018,
    zoom: 5,
};

const MapboxAddressSelector = forwardRef<MapboxAddressSelectorHandle, MapboxAddressSelectorProps>((
    {
        initialLatitude,
        initialLongitude,
        readOnly = false,
        country = 'germany',
    },
    ref
) => {
    const defaultRegion = country === 'denmark' ? DEFAULT_DENMARK : DEFAULT_GERMANY;
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [locationWarning, setLocationWarning] = useState<string | null>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);
    const mapRef = useRef<Mapbox.MapView>(null);

    // Expose getCenter() so MapPickerModal can query the current map centre
    useImperativeHandle(ref, () => ({
        getCenter: async () => {
            try {
                const center = await mapRef.current?.getCenter();
                if (center) return center as [number, number];
                return null;
            } catch {
                return null;
            }
        },
    }));

    useEffect(() => {
        if (!initialLatitude && !initialLongitude) {
            setTimeout(getCurrentLocation, 500);
        } else if (initialLatitude && initialLongitude) {
            setTimeout(() => {
                cameraRef.current?.setCamera({
                    centerCoordinate: [initialLongitude, initialLatitude],
                    zoomLevel: 14,
                    animationDuration: 1000,
                });
            }, 500);
        }
    }, []);

    const getCurrentLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            let { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

            if (status !== 'granted') {
                const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                status = newStatus;
            }

            if (status !== 'granted') {
                setLocationWarning(
                    status === 'denied' && !canAskAgain
                        ? 'Location permission denied. Enable it in Settings or pan the map manually.'
                        : 'Location permission denied. Pan the map to your location.'
                );
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const loc = location.coords;
            cameraRef.current?.setCamera({
                centerCoordinate: [loc.longitude, loc.latitude],
                zoomLevel: 15,
                animationDuration: 1000,
            });
        } catch (error) {
            console.error('Location error:', error);
            setLocationWarning('Could not fetch current location. Pan the map to your address.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSettings = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    }, []);

    const handleMapPress = useCallback((feature: any) => {
        if (readOnly) return;
        const { geometry } = feature;
        if (geometry?.coordinates) {
            const [longitude, latitude] = geometry.coordinates;
            cameraRef.current?.setCamera({
                centerCoordinate: [longitude, latitude],
                animationDuration: 300,
            });
        }
    }, [readOnly]);

    if (!ENV.MAPBOX_PUBLIC_KEY) {
        return (
            <View style={styles.noKeyContainer}>
                <Icon name="map-marker-off" size={48} color={colors.neutral[400]} style={{ marginBottom: 12 }} />
                <Text style={styles.errorText}>Mapbox is not configured. Please add MAPBOX_PUBLIC_KEY to your .env file.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Location warning banner */}
            {locationWarning && (
                <View style={styles.warningBanner}>
                    <Icon name="map-marker-alert-outline" size={16} color="#856404" style={{ marginRight: 6 }} />
                    <Text style={styles.warningText} numberOfLines={2}>{locationWarning}</Text>
                    <TouchableOpacity onPress={() => setLocationWarning(null)} style={{ marginLeft: 6 }}>
                        <Icon name="close" size={16} color="#856404" />
                    </TouchableOpacity>
                </View>
            )}
            {errorMsg ? (
                <View style={styles.errorContainer}>
                    <Icon name="map-marker-off" size={48} color={colors.neutral[400]} style={{ marginBottom: 12 }} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Button
                            mode="outlined"
                            onPress={getCurrentLocation}
                            textColor={colors.primary[500]}
                            style={{ borderColor: colors.primary[500] }}
                        >
                            Retry
                        </Button>
                        {errorMsg.includes('Settings') && (
                            <Button
                                mode="contained"
                                onPress={handleOpenSettings}
                                buttonColor={colors.primary[500]}
                            >
                                Open Settings
                            </Button>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.mapContainer}>
                    <Mapbox.MapView
                        ref={mapRef}
                        style={styles.map}
                        styleURL={Mapbox.StyleURL.Street}
                        onPress={handleMapPress}
                        scrollEnabled={!readOnly}
                        zoomEnabled={!readOnly}
                        pitchEnabled={!readOnly}
                        rotateEnabled={!readOnly}
                        compassEnabled={true}
                        scaleBarEnabled={false}
                    >
                        <Mapbox.Camera
                            ref={cameraRef}
                            defaultSettings={{
                                centerCoordinate: [defaultRegion.longitude, defaultRegion.latitude],
                                zoomLevel: defaultRegion.zoom,
                            }}
                        />

                        <Mapbox.UserLocation
                            visible={true}
                            showsUserHeadingIndicator={true}
                        />
                    </Mapbox.MapView>

                    {/* Centered Pin Indicator */}
                    {!readOnly && (
                        <View style={styles.centerMarkerContainer} pointerEvents="none">
                            <Icon name="map-marker" size={40} color={colors.primary[600]} style={{ marginBottom: 40 }} />
                        </View>
                    )}

                    {/* Current Location Button */}
                    {!readOnly && (
                        <TouchableOpacity style={styles.myLocationButton} onPress={getCurrentLocation}>
                            <Icon name="crosshairs-gps" size={24} color={colors.primary[600]} />
                        </TouchableOpacity>
                    )}

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary[500]} />
                        </View>
                    )}
                </View>
            )}
            {!readOnly && (
                <Text style={styles.instructionText}>Move map to adjust location</Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: '#f0f0f0',
    },
    noKeyContainer: {
        height: 200,
        width: '100%',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f0f0f0',
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        borderColor: '#ffc107',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginBottom: 4,
    },
    warningText: {
        flex: 1,
        fontSize: 11,
        color: '#856404',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    centerMarkerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    myLocationButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginBottom: 10,
        color: colors.error[500],
        textAlign: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionText: {
        textAlign: 'center',
        fontSize: getResponsiveFontSize(12),
        color: colors.neutral[500],
        marginTop: 4,
        marginBottom: 4,
    }
});

export default React.memo(MapboxAddressSelector);
