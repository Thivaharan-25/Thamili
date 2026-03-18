import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CardField, CardFieldInput } from '@stripe/stripe-react-native';
import Input from './Input';
import { colors } from '../theme';

interface PaymentFormProps {
  cardholderName: string;
  onCardholderNameChange: (text: string) => void;
  onCardChange: (cardDetails: CardFieldInput.Details) => void;
  style?: any;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  cardholderName,
  onCardholderNameChange,
  onCardChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Card Details</Text>

      <Input
        label="Card holder Name"
        placeholder="Enter name as on card"
        value={cardholderName}
        onChangeText={onCardholderNameChange}
        autoCapitalize="words"
        containerStyle={styles.input}
      />

      <Text style={styles.label}>Card Information</Text>
      {Platform.OS !== 'web' ? (
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: 'Card Number',
          }}
          cardStyle={{
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
          }}
          style={styles.cardField}
          onCardChange={(cardDetails) => {
            onCardChange(cardDetails);
          }}
        />
      ) : (
        <Text style={styles.webWarning}>
          Card input is not supported on web in this demo.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 10,
  },
  webWarning: {
    color: colors.error[500],
    fontStyle: 'italic',
  }
});

export default PaymentForm;
