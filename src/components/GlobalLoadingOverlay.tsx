// Simplified imports
import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLoading } from '../contexts/LoadingContext';
import { colors } from '../theme';

console.log('✅ GlobalLoadingOverlay module loaded (Fast/Simple Version)');

/**
 * GlobalLoadingOverlay - Lightweight Loading Overlay
 * Displays a simple semi-transparent background with a spinner.
 * Optimized for zero-lag performance.
 */
export const GlobalLoadingOverlay: React.FC = () => {
    const { isLoading } = useLoading();

    /* 
       Optimization: Log only when state changes to avoid spam, 
       but for critical debugging we keep it minimalist.
    */
    if (!isLoading) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject, // Covers the entire screen
        backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent black dimming
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it sits on top of everything
    },
    spinnerContainer: {
        padding: 24,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
});


