import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';

interface GlassStatCardProps {
    label: string;
    value: string;
    icon: keyof typeof Icon.glyphMap;
    color: string;
    style?: ViewStyle;
    compact?: boolean;
}

const GlassStatCard: React.FC<GlassStatCardProps> = ({
    label,
    value,
    icon,
    color,
    style,
    compact = false
}) => {
    return (
        <View style={[
            styles.glassCard,
            compact && styles.glassCardCompact,
            style
        ]}>
            <View style={styles.glassCardTop}>
                <View style={[styles.glassIcon, { backgroundColor: color + '20' }]}>
                    <Icon name={icon} size={compact ? 20 : 20} color={color} />
                </View>
            </View>
            <Text
                style={[styles.glassValue, compact && styles.glassValueCompact]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit={true}
            >
                {value}
            </Text>
            <Text
                style={[styles.glassLabel, compact && styles.glassLabelCompact]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit={true}
            >
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    glassCard: {
        width: 156,
        height: 124,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 5,
        justifyContent: 'space-between',
    },
    glassCardCompact: {
        width: 140,
        height: undefined, // Let it adjust height
        padding: 12,
        marginRight: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderRadius: 16,
    },
    glassCardTop: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 8,
    },
    glassIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassValue: {
        fontSize: 18,
        lineHeight: 28,
        fontWeight: '800',
        color: colors.navy[900],
        paddingTop: 4,
    },
    glassValueCompact: {
        fontSize: 20,
        paddingTop: 0,
    },
    glassLabel: {
        fontSize: 12,
        lineHeight: 20,
        fontWeight: '600',
        color: colors.neutral[500],
        paddingBottom: 2,
    },
    glassLabelCompact: {
        marginTop: 2,
        paddingBottom: 0,
    }
});

export default GlassStatCard;
