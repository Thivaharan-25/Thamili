import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal, Portal, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme'; // Assuming this exists, or use fallbacks

interface ConfirmationModalProps {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    icon?: string;
    confirmColor?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    onDismiss,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    icon = 'alert-circle-outline',
    confirmColor = colors.primary?.[500] || '#3B82F6',
}) => {
    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={styles.container}
            >
                <View style={styles.content}>
                    <View style={[styles.iconContainer, { backgroundColor: confirmColor + '15' }]}>
                        <Icon name={icon as any} size={48} color={confirmColor} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <Button
                            mode="text"
                            onPress={onDismiss}
                            style={styles.button}
                            labelStyle={{ color: colors.neutral?.[500] || '#6B7280' }}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                onConfirm();
                                onDismiss();
                            }}
                            style={[styles.button, { backgroundColor: confirmColor }]}
                            labelStyle={styles.confirmLabel}
                        >
                            {confirmLabel}
                        </Button>
                    </View>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        padding: 16,
        borderRadius: 50,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        borderRadius: 12,
    },
    confirmLabel: {
        color: 'white',
        fontWeight: '600',
    },
});

export default ConfirmationModal;
