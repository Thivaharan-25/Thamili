import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// உங்கள் App.tsx-ல் colors path எப்படி உள்ளதோ அதுபோல மாற்றவும்.
// பெரும்பாலும் '../theme/colors' அல்லது '../theme' ஆக இருக்கும்.
import { colors } from '../theme/colors';

// --- Types ---
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextData {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

// --- Context ---
const ToastContext = createContext<ToastContextData>({
  showToast: () => { },
  hideToast: () => { },
});

// --- Toast UI Component ---
const ToastMessage = ({
  message,
  type,
  action,
  onHide
}: ToastOptions & { onHide: () => void }) => {
  const insets = useSafeAreaInsets();

  // Animation Values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entry Animation
    translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 350 });
  }, []);

  const handleHide = () => {
    opacity.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(-100, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onHide)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getConfig = () => {
    switch (type) {
      case 'success':
        return { bg: '#10B981', icon: 'check-circle-outline' };
      case 'error':
        return { bg: '#EF4444', icon: 'alert-circle-outline' };
      case 'warning':
        return { bg: '#F59E0B', icon: 'alert-outline' };
      default:
        return { bg: '#3B82F6', icon: 'information-outline' };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        animatedStyle,
        {
          backgroundColor: config.bg,
          top: insets.top + 10,
        }
      ]}
    >
      <View style={styles.contentRow}>
        <Icon name={config.icon as any} size={24} color="#FFF" />
        <View style={styles.textContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>

        {action ? (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
            <Icon name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// --- Provider ---
// இதுதான் முக்கியம்! இந்த Provider உள்ளேயே Toast render ஆகிறது.
// அதனால்தான் தனியாக ToastContainer தேவையில்லை.
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    if (timer) clearTimeout(timer);
    setToast(options);
    const newTimer = setTimeout(() => {
      setToast(null);
    }, options.duration || 3000);
    setTimer(newTimer);
  }, [timer]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <View style={styles.overlay} pointerEvents="box-none">
          <ToastMessage key={Date.now()} {...toast} onHide={hideToast} />
        </View>
      )}
    </ToastContext.Provider>
  );
};

// --- Hook ---
export const useToast = () => useContext(ToastContext);

// --- Styles ---
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    width: '92%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  contentRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { flex: 1, marginLeft: 12, marginRight: 8 },
  messageText: { color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  actionButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  closeButton: { padding: 4 },
});