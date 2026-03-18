/**
 * Payment Method Logos Component
 * Displays payment provider logos (Stripe, Visa, Mastercard, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';

interface PaymentLogosProps {
  showStripe?: boolean;
  showCards?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

const PaymentLogos: React.FC<PaymentLogosProps> = ({
  showStripe = true,
  showCards = true,
  size = 'md',
  style,
}) => {
  const getSize = () => {
    switch (size) {
      case 'sm':
        return { icon: 16, text: 10 };
      case 'lg':
        return { icon: 32, text: 14 };
      default:
        return { icon: 24, text: 12 };
    }
  };

  const sizeConfig = getSize();

  return (
    <View style={[styles.container, style]}>
      {showStripe && (
        <View style={styles.logoGroup}>
          <View style={styles.stripeLogo}>
            <Text style={[styles.stripeText, { fontSize: sizeConfig.text }]}>
              Stripe
            </Text>
          </View>
        </View>
      )}
      
      {showCards && (
        <View style={styles.cardGroup}>
          <View style={styles.cardLogo}>
            <Icon name="credit-card" size={sizeConfig.icon} color="#1A1F71" />
            <Text style={[styles.cardText, { fontSize: sizeConfig.text }]}>Visa</Text>
          </View>
          <View style={styles.cardLogo}>
            <Icon name="credit-card" size={sizeConfig.icon} color="#EB001B" />
            <Text style={[styles.cardText, { fontSize: sizeConfig.text }]}>Mastercard</Text>
          </View>
          <View style={styles.cardLogo}>
            <Icon name="credit-card" size={sizeConfig.icon} color="#006FCF" />
            <Text style={[styles.cardText, { fontSize: sizeConfig.text }]}>Amex</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripeLogo: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stripeText: {
    color: 'white',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: colors.neutral[50],
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cardText: {
    color: colors.neutral[700],
    fontWeight: '600',
  },
});

export default PaymentLogos;

