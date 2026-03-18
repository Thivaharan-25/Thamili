/**
 * Custom Alert Modal Component with Glassmorphism Theme
 * Matches the app's design system
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, Pressable } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import { colors } from '../theme';

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText,
  onConfirm,
  showCancel = false,
  cancelText,
  onCancel,
}) => {
  const { t } = useTranslation();
  
  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('🔵 [AlertModal] Modal is visible, message:', message);
    }
  }, [visible, message]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return { name: 'alert-circle', color: colors.error[500] };
      case 'success':
        return { name: 'check-circle', color: colors.success[500] };
      case 'warning':
        return { name: 'alert', color: colors.warning[500] };
      default:
        return { name: 'information', color: colors.primary[500] };
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'error':
        return t('common.error');
      case 'success':
        return t('common.success');
      case 'warning':
        return t('common.warning');
      default:
        return t('common.information');
    }
  };
  
  const getConfirmText = () => {
    if (confirmText) return confirmText;
    return t('common.ok');
  };
  
  const getCancelText = () => {
    if (cancelText) return cancelText;
    return t('common.cancel');
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return colors.error[50] || '#FEF2F2';
      case 'success':
        return colors.success[50] || '#F0FDF4';
      case 'warning':
        return colors.warning[50] || '#FFFBEB';
      default:
        return 'rgba(255, 255, 255, 0.95)';
    }
  };

  const icon = getIcon();
  const modalTitle = getTitle();
  const backgroundColor = getBackgroundColor();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
            <Icon name={icon.name as any} size={32} color={icon.color} />
          </View>
        </View>

        {/* Title */}
        {modalTitle && (
          <Text style={styles.title}>{modalTitle}</Text>
        )}

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {showCancel && (
            <Button
              title={getCancelText()}
              onPress={handleCancel}
              variant="outline"
              style={[styles.button, styles.cancelButton]}
            />
          )}
          <Button
            title={getConfirmText()}
            onPress={handleConfirm}
            variant="primary"
            style={[styles.button, !showCancel && styles.fullWidthButton]}
          />
        </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  container: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(58, 181, 209, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    borderColor: colors.neutral[300],
  },
  fullWidthButton: {
    width: '100%',
  },
});

export default AlertModal;

