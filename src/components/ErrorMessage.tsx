/**
 * Modern Animated Error Message Component
 * Beautiful error messages with animations and retry functionality
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING, ANIMATION_DURATION } from '../utils/animations';
import { classifyError, isOnline, retryWithBackoff } from '../utils/networkUtils';
import Button from './Button';

const AnimatedView = Animated.createAnimatedComponent(View);

interface ErrorMessageProps {
  message: string;
  error?: any; // Original error object for classification
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info' | 'network';
  style?: any;
  className?: string;
  showIcon?: boolean;
  autoDetectType?: boolean; // Automatically detect error type
  retryWithBackoff?: boolean; // Use exponential backoff for retries
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  error,
  onRetry,
  onDismiss,
  type: propType = 'error',
  style,
  className = '',
  showIcon = true,
  autoDetectType = true,
  retryWithBackoff: useBackoff = false,
}) => {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  
  // Auto-detect error type if enabled
  const detectedType = React.useMemo(() => {
    if (!autoDetectType || !error) return propType;
    const classification = classifyError(error);
    return classification.type === 'network' ? 'network' : propType;
  }, [autoDetectType, error, propType]);
  
  const type = detectedType;
  
  // Get user-friendly message
  const userMessage = React.useMemo(() => {
    if (error && autoDetectType) {
      const classification = classifyError(error);
      return classification.userMessage || message;
    }
    return message;
  }, [error, autoDetectType, message]);
  
  // Check network status
  useEffect(() => {
    if (type === 'network' || autoDetectType) {
      isOnline().then(setNetworkStatus);
    }
  }, [type, autoDetectType]);

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const iconScale = useSharedValue(0.8);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, EASING.spring);
    opacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
    
    // Icon animation
    iconScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1, EASING.spring)
    );
    iconRotation.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withSpring(0, EASING.spring)
    );
  }, []);

  const handleRetry = async () => {
    if (onRetry && !retrying) {
      setRetrying(true);
      try {
        if (useBackoff) {
          await retryWithBackoff(async () => {
            await onRetry();
          });
        } else {
          await onRetry();
        }
      } catch (retryError) {
        // Retry failed, error will be shown by parent component
        console.warn('Retry failed:', retryError);
      } finally {
        setTimeout(() => setRetrying(false), 1000);
      }
    }
  };
  
  const isRetryable = React.useMemo(() => {
    if (error && autoDetectType) {
      const classification = classifyError(error);
      return classification.isRetryable;
    }
    return !!onRetry;
  }, [error, autoDetectType, onRetry]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const getTypeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: 'alert',
          bgColor: colors.warning[50],
          borderColor: colors.warning[200],
          textColor: colors.warning[700],
          iconColor: colors.warning[500],
        };
      case 'info':
        return {
          icon: 'information',
          bgColor: colors.primary[50],
          borderColor: colors.primary[200],
          textColor: colors.primary[700],
          iconColor: colors.primary[500],
        };
      case 'network':
        return {
          icon: 'wifi-off',
          bgColor: colors.error[50],
          borderColor: colors.error[200],
          textColor: colors.error[700],
          iconColor: colors.error[500],
        };
      case 'error':
      default:
        return {
          icon: 'alert-circle',
          bgColor: colors.error[50],
          borderColor: colors.error[200],
          textColor: colors.error[700],
          iconColor: colors.error[500],
        };
    }
  };

  const config = getTypeConfig();

  return (
    <AnimatedView
      style={[
        containerStyle,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
        style,
      ]}
      className={`
        flex-row items-center p-4 rounded-xl border-2 mb-4
        ${className}
      `}
      accessibilityRole="alert"
      accessibilityLabel={`${type} message: ${userMessage}`}
      accessibilityLiveRegion="assertive"
    >
      {showIcon && (
        <AnimatedView style={iconStyle} className="mr-3">
          <Icon
            name={config.icon as any}
            size={24}
            color={config.iconColor}
          />
        </AnimatedView>
      )}

      <View className="flex-1">
        <Text
          className="text-base font-semibold mb-1"
          style={{ color: config.textColor }}
        >
          {userMessage}
        </Text>

        {type === 'network' && (
          <View className="mb-3">
            <Text
              className="text-sm mb-1"
              style={{ color: config.textColor, opacity: 0.8 }}
            >
              {networkStatus === false 
                ? t('errors.offlineMessage')
                : t('errors.checkConnection')}
            </Text>
            {networkStatus === false && (
              <View className="flex-row items-center mt-1">
                <Icon name="wifi-off" size={16} color={config.iconColor} />
                <Text
                  className="text-xs ml-1"
                  style={{ color: config.textColor, opacity: 0.7 }}
                >
                  {t('errors.noConnectionDetected')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="flex-row gap-2 mt-2">
          {isRetryable && onRetry && (
            <Button
              title={retrying ? (t('common.loading') || 'Loading...') : (t('errors.tryAgain') || 'Try Again')}
              onPress={handleRetry}
              disabled={retrying || networkStatus === false}
              loading={retrying}
              variant="outline"
              size="sm"
              style={{
                borderColor: config.borderColor,
              }}
              textStyle={{ color: config.textColor }}
              accessibilityLabel={retrying ? 'Retrying...' : 'Retry action'}
              accessibilityHint={networkStatus === false ? 'Cannot retry while offline' : 'Double tap to retry'}
            />
          )}
          {onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              className="p-2"
            >
              <Icon name="close" size={20} color={config.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AnimatedView>
  );
};

export default ErrorMessage;
