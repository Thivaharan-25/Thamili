import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { PaymentMethod } from '../types';
import PaymentLogos from './PaymentLogos';
import TrustBadge from './TrustBadge';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  style?: any;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  style,
}) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Payment Method</Text>

      <TouchableOpacity
        style={[
          styles.option,
          selectedMethod === 'online' && styles.optionSelected,
        ]}
        onPress={() => onSelectMethod('online')}
      >
        <View style={styles.optionContent}>
          <Icon
            name={selectedMethod === 'online' ? 'radiobox-marked' : 'radiobox-blank'}
            size={24}
            color={selectedMethod === 'online' ? '#007AFF' : '#666'}
          />
          <View style={styles.optionText}>
            <Text style={[
              styles.optionTitle,
              selectedMethod === 'online' && styles.optionTitleSelected,
            ]}>
              {t('checkout.onlinePaymentStripe')}
            </Text>
            {t('checkout.paymentReady') ? (
              <Text style={styles.optionSubtitle}>
                {t('checkout.paymentReady')}
              </Text>
            ) : null}
            {selectedMethod === 'online' && (
              <View style={styles.paymentLogosContainer}>
                <PaymentLogos size="sm" />
              </View>
            )}
          </View>
          <View style={styles.rightContent}>
            <Icon name="credit-card" size={24} color={selectedMethod === 'online' ? '#007AFF' : '#666'} />
            {selectedMethod === 'online' && (
              <View style={styles.trustBadgeContainer}>
                <TrustBadge type="secure-payment" size="sm" showLabel={false} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          selectedMethod === 'cod' && styles.optionSelected,
        ]}
        onPress={() => onSelectMethod('cod')}
      >
        <View style={styles.optionContent}>
          <Icon
            name={selectedMethod === 'cod' ? 'radiobox-marked' : 'radiobox-blank'}
            size={24}
            color={selectedMethod === 'cod' ? '#007AFF' : '#666'}
          />
          <View style={styles.optionText}>
            <Text style={[
              styles.optionTitle,
              selectedMethod === 'cod' && styles.optionTitleSelected,
            ]}>
              {t('checkout.cashOnDelivery')}
            </Text>
            {t('checkout.codSubtitle') ? (
              <Text style={styles.optionSubtitle}>
                {t('checkout.codSubtitle')}
              </Text>
            ) : null}
          </View>
          <Icon name="cash" size={24} color={selectedMethod === 'cod' ? '#007AFF' : '#666'} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentLogosContainer: {
    marginTop: 8,
  },
  rightContent: {
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeContainer: {
    marginTop: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#007AFF',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default React.memo(PaymentMethodSelector);

