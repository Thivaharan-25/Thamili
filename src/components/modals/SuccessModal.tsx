import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Portal, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme'; // Assuming colors are available here, adjust if needed

interface SuccessModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
}
const SuccessModal: React.FC<SuccessModalProps> = ({ visible, onDismiss, title, message }) => {
  const { t } = useTranslation();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="check-circle" size={64} color={colors.success?.[500] || '#22C55E'} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            textColor="white"
          >
            {t('common.done')}
          </Button>
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
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    backgroundColor: '#F0FDF4', // Light green
    padding: 16,
    borderRadius: 50,
  },
  title: {
    fontSize: 20,
    lineHeight: 28, // Increased
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
    lineHeight: 24, // Increased
  },
  button: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.success?.[500] || '#22C55E',
    marginTop: 8,
    paddingVertical: 2, // Added padding to button container if needed, or rely on label padding
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 24, // Increased
    fontWeight: '600',
    paddingVertical: 8, // Increased
  },
});

export default SuccessModal;
