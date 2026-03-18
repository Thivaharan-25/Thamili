import React, { useRef, useState, useCallback } from 'react';
import { View, Modal, StyleSheet, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import MapboxAddressSelector, { MapboxAddressSelectorHandle } from './MapboxAddressSelector';
import { colors } from '../theme';
import Button from './Button';
import { mapboxService } from '../services/mapboxService';

interface MapPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (location: {
        latitude: number;
        longitude: number;
        address?: string;
        city?: string;
        postalCode?: string;
    }) => void;
    initialLatitude?: number;
    initialLongitude?: number;
    country?: 'germany' | 'denmark';
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
    visible,
    onClose,
    onSelect,
    initialLatitude,
    initialLongitude,
    country = 'germany',
}) => {
    const mapRef = useRef<MapboxAddressSelectorHandle>(null);
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = useCallback(async () => {
        setConfirming(true);
        try {
            const center = await mapRef.current?.getCenter();
            if (!center) {
                setConfirming(false);
                return;
            }
            const [longitude, latitude] = center;
            const result = await mapboxService.reverseGeocode(latitude, longitude);
            onSelect({
                latitude,
                longitude,
                address: result?.address,
                city: result?.city,
                postalCode: result?.postalCode,
            });
        } catch (error) {
            console.error('Error confirming location:', error);
            // Still confirm with coordinates only
            const center = await mapRef.current?.getCenter().catch(() => null);
            if (center) {
                onSelect({ latitude: center[1], longitude: center[0] });
            }
        } finally {
            setConfirming(false);
        }
    }, [onSelect]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={28} color={colors.navy[800]} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Pick Location</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.mapWrapper}>
                    <MapboxAddressSelector
                        ref={mapRef}
                        country={country}
                        initialLatitude={initialLatitude}
                        initialLongitude={initialLongitude}
                    />
                </View>

                <View style={styles.footer}>
                    <Button
                        title={confirming ? 'Getting address…' : 'Confirm Location'}
                        onPress={handleConfirm}
                        disabled={confirming}
                        fullWidth
                        variant="primary"
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.navy[800],
    },
    mapWrapper: {
        flex: 1,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        backgroundColor: colors.white,
    },
});

export default MapPickerModal;
