import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

interface StatisticsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  style?: any;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  label,
  value,
  icon,
  iconColor = '#007AFF',
  trend,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Icon name={icon as any} size={24} color={iconColor} />
          </View>
        )}
        {trend && (
          <View style={styles.trendContainer}>
            <Icon
              name={(trend.isPositive ? 'trending-up' : 'trending-down') as any}
              size={16}
              color={trend.isPositive ? '#34C759' : '#FF3B30'}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.isPositive ? '#34C759' : '#FF3B30' },
              ]}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
    flex: 1,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
});

export default StatisticsCard;

