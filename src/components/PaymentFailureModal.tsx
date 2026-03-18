import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import Button from './Button';

interface PaymentFailureModalProps {
    visible: boolean;
    error: string | null;
    onClose: () => void;
    onRetry: () => void;
}

const PaymentFailureModal: React.FC<PaymentFailureModalProps> = ({
    visible,
    error,
    onClose,
    onRetry,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Icon name="close-circle" size={60} color={colors.error[500]} />
                    </View>

                    <Text style={styles.title}>Payment Failed</Text>

                    <Text style={styles.message}>
                        {error || "We couldn't process your payment. Please check your card details and try again."}
                    </Text>

                    <View style={styles.buttonContainer}>
                        <Button
                            title="Try Again"
                            onPress={onRetry}
                            style={styles.retryButton}
                        />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
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
    container: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.neutral[900],
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.neutral[600],
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    retryButton: {
        width: '100%',
    },
    closeButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: colors.neutral[500],
        fontWeight: '600',
    },
});

export default PaymentFailureModal;
