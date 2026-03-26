/**
 * Modern Checkout Screen with Step Indicator and Smooth Form Progression
 * Uses NativeWind for styling and Phase 2 components
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, Platform, Linking, Dimensions, Modal, KeyboardAvoidingView, BackHandler, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList, PaymentMethod, Order, OrderItem } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useLoading } from '../../contexts/LoadingContext';
import { useQuery } from '@tanstack/react-query';
import { userService, pickupPointService, addressService, orderService } from '../../services';

import { stripeService } from '../../services/stripeService';
import { paymentMethodService } from '../../services';
import { useStripe } from '@stripe/stripe-react-native';
import {
  AppHeader,
  OrderSummary,
  PickupPointSelector,
  DeliveryAddressForm,
  PaymentMethodSelector,
  Button,
  LoadingOverlay,
  ErrorMessage,
  AnimatedView,
  Badge,
  EmptyState,
  TrustBadge,
  useToast,
  CheckoutProgressIndicator,
  FormErrorSummary,
  PaymentProcessingOverlay,
  PaymentFailureModal,
  SuccessCelebration,
  OrderReceipt,
  PhoneInput,
  Input,
} from '../../components';
import { usePickupPoints } from '../../hooks';
// StripePaymentButton is now handled internally for a more seamless experience
import { formatCartSummary, calculateDeliveryFee, calculateCartSubtotal, calculatePaymentFee } from '../../utils/cartUtils';
import { validateCheckout, CheckoutFormData } from '../../utils/checkoutValidation';
import { validateCart } from '../../utils/cartValidation';
import { validatePhone } from '../../utils/fieldValidation';
import { formatPhoneNumber, validatePhoneNumberForCountry } from '../../utils/regionalFormatting';
import { useCheckoutAutoSave, getCheckoutData, clearCheckoutData } from '../../utils/checkoutAutoSave';
import { successHaptic, errorHaptic, warningHaptic } from '../../utils/hapticFeedback';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import {
  isSmallDevice,
  isTablet,
  isLandscape,
  getScreenWidth,
  getResponsivePadding,
  getResponsiveFontSize,
  MIN_TOUCH_TARGET,
} from '../../utils/responsive';

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;

type CheckoutStep = 'summary' | 'delivery' | 'payment' | 'review';

const CheckoutScreen = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { items, removeSelectedItems, selectedCountry } = useCartStore();
  const selectedItems = useMemo(() => items.filter(i => i.isSelected), [items]);
  const { showToast } = useToast();
  const loading = useLoading();
  const { retrievePaymentIntent, initPaymentSheet, presentPaymentSheet } = useStripe();

  // Use user's country preference if authenticated, otherwise use selected country from cart store
  const rawCountry = (isAuthenticated && user?.country_preference && (user.country_preference === COUNTRIES.GERMANY || user.country_preference === COUNTRIES.DENMARK))
    ? user.country_preference
    : (selectedCountry || COUNTRIES.GERMANY);

  // Normalize country for consistent usage
  const country = (rawCountry?.toLowerCase() || COUNTRIES.GERMANY) as Country;

  const insets = useSafeAreaInsets();

  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const screenWidth = screenData.width;
  const screenHeight = screenData.height;
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const isLandscapeMode = isLandscape();
  const padding = getResponsivePadding();

  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Calculate tab bar height to position sticky button above it
  const tabBarHeight = Platform.OS === 'ios' ? 60 : 56;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);
  const totalTabBarHeight = tabBarHeight + bottomPadding;

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('summary');
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'pickup'>('pickup');
  const [isHomeDelivery, setIsHomeDelivery] = useState(false); // Kept for backward compatibility logic, but we should sync it
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<{
    street: string;
    city: string;
    postalCode: string;
    instructions: string;
    latitude?: number;
    longitude?: number;
  }>({
    street: '',
    city: '',
    postalCode: '',
    instructions: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [orderIdempotencyKey, setOrderIdempotencyKey] = useState<string | null>(null);
  const [isPaymentFailureVisible, setIsPaymentFailureVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [isAddressesLoaded, setIsAddressesLoaded] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPostOrderConfirmation, setShowPostOrderConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const autoRedirectTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Snapshot of cart items at order placement time (before removeSelectedItems clears them)
  const [snapshotOrderItems, setSnapshotOrderItems] = useState<typeof selectedItems>([]);

  // Sync delivery method state
  useEffect(() => {
    setIsHomeDelivery(deliveryMethod === 'home');
  }, [deliveryMethod]);

  // Fetch existing addresses and pre-fill
  useEffect(() => {
    let isMounted = true;

    const fetchExistingAddress = async () => {
      // Don't fetch if already loaded or not authenticated
      if (!isAuthenticated || !user?.id || isAddressesLoaded) {
        if (__DEV__) console.log(`ℹ️ [Checkout] Skipping address fetch: auth=${isAuthenticated}, user=${user?.id}, loaded=${isAddressesLoaded}`);
        return;
      }

      try {
        if (__DEV__) console.log(`📡 [Checkout] Fetching existing addresses for user: ${user.id}`);
        const addresses = await addressService.getUserAddresses(user.id);

        if (!isMounted) return;

        if (__DEV__) console.log(`✅ [Checkout] Found ${addresses.length} addresses in DB`);

        if (addresses.length > 0) {
          // Priority: 1. Type is 'Home', 2. is_default is true, 3. First available
          const homeAddr = addresses.find(a => a.type === 'Home') ||
            addresses.find(a => a.is_default) ||
            addresses[0];

          if (homeAddr) {
            if (__DEV__) console.log('📍 [Checkout] Selecting pre-fill address:', homeAddr.street, `(Type: ${homeAddr.type})`);

            setDeliveryAddress(prev => {
              // Only overwrite if form is currently empty
              const isEmpty = !prev.street && !prev.city;
              if (isEmpty) {
                if (__DEV__) console.log('✍️ [Checkout] Pre-filling empty address form');
                return {
                  ...prev,
                  street: homeAddr.street || '',
                  city: homeAddr.city || '',
                  postalCode: homeAddr.postal_code || '',
                  latitude: homeAddr.latitude,
                  longitude: homeAddr.longitude,
                  instructions: homeAddr.instructions || prev.instructions || '',
                };
              } else {
                if (__DEV__) console.log('⚠️ [Checkout] Form not empty, skipping pre-fill to avoid overwriting edits');
                return prev;
              }
            });
          }
        } else {
          if (__DEV__) console.log('ℹ️ [Checkout] No addresses found in DB for this user');
        }

        setIsAddressesLoaded(true);
      } catch (error) {
        if (__DEV__) console.error('❌ [Checkout] Failed to fetch existing address:', error);
      }
    };

    const syncPhone = () => {
      if (!user?.phone) return;
      const prefixDigits = country === COUNTRIES.GERMANY ? '49' : '45';
      const digits = user.phone.replace(/\D/g, '');
      if (digits.startsWith(prefixDigits)) {
        setPhoneNumber(digits.substring(prefixDigits.length));
      } else {
        setPhoneNumber(digits);
      }
    };

    fetchExistingAddress();
    syncPhone();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, isAddressesLoaded, country, user?.phone]);

  // Nearest pickup point is NOT auto-selected — user must choose manually.

  // Load saved checkout data on mount
  useEffect(() => {
    getCheckoutData().then((savedData) => {
      if (!savedData) return;

      if (__DEV__) console.log('💾 [Checkout] Loading saved checkout data');

      if (savedData.isHomeDelivery !== undefined) {
        const method = savedData.isHomeDelivery ? 'home' : 'pickup';
        setDeliveryMethod(method);
        setIsHomeDelivery(savedData.isHomeDelivery);
      }
      if (savedData.selectedPickupPointId !== undefined) {
        setSelectedPickupPointId(savedData.selectedPickupPointId);
      }

      // Only apply saved address if it actually has some content
      if (savedData.deliveryAddress && (savedData.deliveryAddress.street || savedData.deliveryAddress.city)) {
        if (__DEV__) console.log('📍 [Checkout] Restoring saved address from storage');
        setDeliveryAddress(prev => ({ ...prev, ...savedData.deliveryAddress }));
        // If we restored from storage, we can skip the DB pre-fill
        setIsAddressesLoaded(true);
      }

      if (savedData.paymentMethod) {
        setPaymentMethod(savedData.paymentMethod as PaymentMethod);
      }
      if (savedData.paymentDetails) {
        setPaymentDetails(savedData.paymentDetails);
      }
    });
  }, []);

  // Auto-save form data when it changes
  useCheckoutAutoSave({
    isHomeDelivery,
    selectedPickupPointId,
    deliveryAddress,
    paymentMethod: paymentMethod || undefined,
    paymentDetails,
  });

  // Fetch pickup points using cached hook
  const { data: pickupPoints = [], isLoading: loadingPickupPoints } = usePickupPoints(country);

  // Fetch saved addresses for address selector
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => addressService.getUserAddresses(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Calculate totals
  const selectedPickupPoint = useMemo(() => {
    return pickupPoints.find((p) => p.id === selectedPickupPointId) || null;
  }, [pickupPoints, selectedPickupPointId]);

  const cartSummary = useMemo(() => {
    return formatCartSummary(
      selectedItems,
      country,
      selectedPickupPoint,
      isHomeDelivery,
      paymentMethod,
      deliveryAddress // Pass the full address object which contains lat/lon
    );
  }, [selectedItems, country, selectedPickupPoint, isHomeDelivery, paymentMethod, deliveryAddress]);

  // Pass coordinates to subtotal calculation if needed for other logic
  const subtotalValue = useMemo(() => {
    return calculateCartSubtotal(selectedItems, country);
  }, [selectedItems, country]);

  // Validate cart
  const cartValidation = useMemo(() => {
    return validateCart(selectedItems);
  }, [selectedItems]);

  const steps: { key: CheckoutStep; label: string; icon: string }[] = [
    { key: 'summary', label: t('checkout.summary'), icon: 'receipt' },
    { key: 'delivery', label: t('checkout.delivery'), icon: 'truck-delivery' },
    { key: 'payment', label: t('checkout.payment'), icon: 'credit-card' },
    { key: 'review', label: t('checkout.review'), icon: 'check-circle' },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex((s) => s.key === currentStep);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'summary':
        return cartValidation.isValid;
      case 'delivery':
        // For home delivery, we need address AND a fallback pickup point
        // For pickup only, we just need a pickup point
        return deliveryMethod === 'home'
          ? !!(deliveryAddress.street && deliveryAddress.city && deliveryAddress.postalCode && selectedPickupPointId)
          : !!selectedPickupPointId;
      case 'payment':
        {
          const fullPhone = `${country === COUNTRIES.GERMANY ? '49' : '45'}${phoneNumber.trim()}`;
          return paymentMethod !== null && phoneNumber.trim().length > 0 && validatePhoneNumberForCountry(fullPhone, country).isValid;
        }
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      warningHaptic();
      showToast({
        message: t('checkout.completeFields'),
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    } else {
      navigation.goBack();
    }
  };

  // Cancel auto-redirect timer and navigate to Cart
  const handleOrderSuccessBack = useCallback(() => {
    // Clear timers
    if (autoRedirectTimer.current) {
      clearTimeout(autoRedirectTimer.current);
      autoRedirectTimer.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    // Clear processing flags so beforeRemove listener won't block
    setIsProcessing(false);
    setIsCreatingPaymentIntent(false);
    // Use CommonActions.reset (root-level) — same pattern used in AppNavigator
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Cart' } }],
      })
    );
  }, [navigation]);

  // Create order first (for both COD and online payment)
  const createOrder = async () => {
    if (!user) {
      throw new Error('Please login to place an order');
    }

    if (!cartValidation.isValid) {
      throw new Error(cartValidation.errors.join('\n'));
    }

    const formData: CheckoutFormData = {
      isHomeDelivery: deliveryMethod === 'home',
      pickupPointId: selectedPickupPointId,
      deliveryAddress,
      paymentMethod,
      paymentDetails,
      phone: phoneNumber,
    };

    const validation = validateCheckout(formData, country);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      // Create a more helpful error message listing missing fields
      const errorMessages = Object.values(validation.errors);
      const errorMessage = errorMessages.length > 0
        ? `${t('common.error')}:\n${errorMessages.join('\n')}`
        : t('checkout.fillRequiredFields');
      throw new Error(errorMessage);
    }

    setValidationErrors({});

    const orderItems = selectedItems.map((item) => {
      const price = country === COUNTRIES.GERMANY
        ? item.product.price_germany
        : item.product.price_denmark;
      return {
        product_id: item.product.id,
        quantity: item.quantity,
        price,
        product_category: item.product.category,
        sell_type: item.product.sell_type,
        pack_size_grams: item.product.pack_size_grams,
        unit: item.product.unit,
      };
    });

    const deliveryAddressString = deliveryMethod === 'home'
      ? `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.postalCode}${deliveryAddress.instructions ? ` - ${deliveryAddress.instructions}` : ''}`
      : undefined;

    // Generate idempotency key if not already set (prevents duplicate orders)
    const idempotencyKey = orderIdempotencyKey ||
      `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (!orderIdempotencyKey) {
      setOrderIdempotencyKey(idempotencyKey);
    }

    if (__DEV__) console.log('📡 [createOrder] Creating order with data:', {
      deliveryMethod,
      pickup_point_id: selectedPickupPointId,
      delivery_address: deliveryAddressString,
      country
    });

    const paymentFee = calculatePaymentFee(
      calculateCartSubtotal(selectedItems, country) + cartSummary.deliveryFeeValue,
      paymentMethod
    );

    const fullPhoneNumber = `${country === COUNTRIES.GERMANY ? '+49' : '+45'}${phoneNumber.replace(/\s/g, '')}`;

    const order = await orderService.createOrder({
      user_id: user.id,
      country,
      payment_method: paymentMethod!,
      // Always send pickup point ID (as fallback for home delivery or main for pickup)
      pickup_point_id: selectedPickupPointId!,
      delivery_address: deliveryAddressString,
      delivery_method: deliveryMethod, // Send explicit method
      delivery_fee: cartSummary.deliveryFeeValue,
      payment_fee: paymentFee,
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
      phone: fullPhoneNumber,
      items: orderItems,
      idempotency_key: idempotencyKey,
    });

    return order;
  };

  // Handle the entire online payment flow seamlessly
  // (useStripe moved to component top)

  const handleCreatePaymentIntent = async () => {
    if (paymentMethod !== 'online') {
      return;
    }

    // Prevent duplicate submissions
    if (isProcessing || isCreatingPaymentIntent) {
      return;
    }

    // 1. Loading spinner-ஐ உடனடியாக show செய்யவும்
    loading.showLoading();

    // ✅ KEY FIX: setTimeout wraps the async work to allow UI paint
    setTimeout(() => {
      if (__DEV__) console.log('🕒 [Checkout] Timer fired, starting payment intent creation');

      const processPayment = async () => {
        setIsCreatingPaymentIntent(true);
        setIsProcessing(true);

        // 1. Create the order
        const order = await createOrder();
        setCreatedOrderId(order.id);

        // 2. Create payment intent
        const currency = 'eur';
        const paymentIntent = await stripeService.createPaymentIntent({
          orderId: order.id,
          amount: cartSummary.totalValue,
          currency,
          metadata: {
            userId: user!.id,
            country,
          },
          setupFutureUsage: true,
        });

        setPaymentIntentClientSecret(paymentIntent.clientSecret);
        setPaymentIntentId(paymentIntent.paymentIntentId);

        // 3. Initialize Payment Sheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: paymentIntent.clientSecret,
          merchantDisplayName: 'Thamili',
          defaultBillingDetails: {
            name: user?.name || '',
            email: user?.email || '',
          },
          billingDetailsCollectionConfiguration: {
            address: 'Automatic',
          } as any,
        });

        if (initError) {
          throw new Error(initError.message);
        }

        // 4. Present Payment Sheet immediately
        setIsCreatingPaymentIntent(false);
        setIsProcessing(false);

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === 'Canceled') {
            return;
          }
          throw new Error(presentError.message);
        }

        // 5. Success! 
        if (__DEV__) console.log('✅ [handleCreatePaymentIntent] PaymentSheet presented successfully');
        await handlePaymentSuccess(order.id);
      };

      processPayment()
        .catch((error: any) => {
          if (__DEV__) console.error('❌ [handleCreatePaymentIntent] Error:', error);
          errorHaptic();
          setIsProcessing(false);
          setIsCreatingPaymentIntent(false);

          const errorMsg = error.message || t('checkout.failedToProcess');
          setPaymentError(errorMsg);
          setIsPaymentFailureVisible(true);

          showToast({
            message: errorMsg,
            type: 'error',
            duration: 4000,
          });
        })
        .finally(() => {
          if (__DEV__) console.log('🏁 [Checkout] Finally block reached, scheduling hideLoading in 100ms');
          setTimeout(() => {
            // Only hide if we are NOT navigating to success (which handles its own loading)
            if (!isPaymentFailureVisible) {
              loading.hideLoading();
            }
          }, 100);
        });
    }, 50);
  };

  // Handle payment success
  const handlePaymentSuccess = async (orderId?: string) => {
    const orderIdToUse = orderId || createdOrderId;

    if (!orderIdToUse) {
      if (__DEV__) console.error('❌ [handlePaymentSuccess] No order ID found for success handling');
      setIsProcessing(false);
      setIsCreatingPaymentIntent(false);
      loading.hideLoading(); // Ensure spinner hides
      return;
    }

    if (__DEV__) console.log(`✅ [handlePaymentSuccess] Starting success flow for order: ${orderIdToUse}`);
    setIsProcessing(true);
    loading.showLoading(); // Ensure spinner is shown during finalizing

    try {
      // 1. Update order payment status to 'paid' in Supabase
      if (__DEV__) console.log(`📡 [handlePaymentSuccess] Updating payment status to "paid" for: ${orderIdToUse}`);

      // We wrap this in a try-catch so that even if the status update fails, 
      // we still attempt to clean up and navigate to avoid the user getting stuck.
      try {
        await orderService.updatePaymentStatus(orderIdToUse, 'paid');
        if (__DEV__) console.log('✅ [handlePaymentSuccess] Status updated successfully');
      } catch (statusError) {
        if (__DEV__) console.error('⚠️ [handlePaymentSuccess] Status update failed, but proceeding:', statusError);
      }

      // Snapshot items BEFORE cleanup so the receipt can display them
      setSnapshotOrderItems([...selectedItems]);

      // 2. Perform cleanup (Only setting flags here, data removal happens after popup)
      // Set flag to trigger success popup and prevent processing
      setIsOrderPlaced(true);
      setShowPostOrderConfirmation(true); // Skip intermediate receipt
      setIsSuccess(true);

      // Update local user state AND backend immediately with the new phone number
      if (user && phoneNumber) {
        try {
          const fullPhoneNumber = `${country === COUNTRIES.GERMANY ? '+49' : '+45'}${phoneNumber.replace(/\s/g, '')}`;
          // Check if phone needs updating in backend
          if (!user.phone || user.phone !== fullPhoneNumber) {
            if (__DEV__) console.log('📱 [handlePaymentSuccess] Syncing new phone number to profile:', fullPhoneNumber);
            await userService.updateUserProfile(user.id, { phone: fullPhoneNumber });
          }

          const { useAuthStore } = require('../../store/authStore');
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.getState().setUser({
              ...currentUser,
              phone: fullPhoneNumber
            });
          }
        } catch (updateErr) {
          if (__DEV__) console.warn('Failed to update user profile phone:', updateErr);
        }
      }

      // 2. Perform cleanup
      try {
        await Promise.all([
          removeSelectedItems(),
          clearCheckoutData()
        ]);
      } catch (cleanupErr) {
        if (__DEV__) console.warn('⚠️ [handlePaymentSuccess] Cleanup warning:', cleanupErr);
      }

      // Navigation is now handled by SuccessCelebration onComplete

    } catch (error: any) {
      if (__DEV__) console.error('❌ [handlePaymentSuccess] Error in success flow:', error);
      warningHaptic();
      setIsProcessing(false);
      setIsCreatingPaymentIntent(false);
      // Still attempt navigation if we have the ID so the user isn't stuck
      // navigation.replace('OrderConfirmation', { orderId: orderIdToUse }); // Removed as navigation is handled by SuccessCelebration
    }
  };

  // Handle payment failure
  const handlePaymentFailure = (error: string) => {
    errorHaptic();
    setPaymentError(error || 'Payment could not be processed. Please try again.');
    setIsPaymentFailureVisible(true);

    setIsProcessing(false);
    setIsCreatingPaymentIntent(false);
    // Reset payment intent to allow retry
    setPaymentIntentClientSecret(null);
    setPaymentIntentId(null);
  };

  // Handle COD order placement
  const handlePlaceCODOrder = async () => {
    if (__DEV__) console.log('📦 [handlePlaceCODOrder] Started — isProcessing:', isProcessing, 'deliveryMethod:', deliveryMethod, 'selectedPickupPointId:', selectedPickupPointId);
    // Prevent duplicate submissions
    if (isProcessing) {
      if (__DEV__) console.warn('⚠️ [handlePlaceCODOrder] Blocked — isProcessing is true');
      return;
    }

    // Guard: pickup delivery needs a pickup point selected
    if (deliveryMethod === 'pickup' && !selectedPickupPointId) {
      if (__DEV__) console.warn('⚠️ [handlePlaceCODOrder] No pickup point selected for pickup delivery');
      Alert.alert(
        t('checkout.selectPickupPoint'),
        t('checkout.selectPickupPointNote'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setIsProcessing(true);
    if (__DEV__) console.log('🚀 [handlePlaceCODOrder] Calling createOrder...');
    try {
      const order = await createOrder();
      if (__DEV__) console.log('✅ [handlePlaceCODOrder] Order created:', order.id);
      // Ensure we have the ID for the callback
      setCreatedOrderId(order.id);

      // Update local user state AND backend immediately with the new phone number
      // This ensures Edit Profile screen shows it without needing a refresh
      if (user && phoneNumber) {
        try {
          const fullPhoneNumber = `${country === COUNTRIES.GERMANY ? '+49' : '+45'}${phoneNumber.replace(/\s/g, '')}`;
          // Check if phone needs updating in backend
          if (!user.phone || user.phone !== fullPhoneNumber) {
            if (__DEV__) console.log('📱 [handlePlaceCODOrder] Syncing new phone number to profile:', fullPhoneNumber);
            await userService.updateUserProfile(user.id, { phone: fullPhoneNumber });
          }

          const { useAuthStore } = require('../../store/authStore');
          const currentUser = require('../../store/authStore').useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.getState().setUser({
              ...currentUser,
              phone: fullPhoneNumber
            });
          }
        } catch (updateErr) {
          if (__DEV__) console.warn('Failed to update user profile phone:', updateErr);
        }
      }

      // Snapshot items BEFORE cleanup so the receipt can display them
      setSnapshotOrderItems([...selectedItems]);

      // COD orders are already created with pending payment status

      // Cleanup logic moved to SuccessCelebration onComplete to keep background populated
      setIsOrderPlaced(true);
      setShowPostOrderConfirmation(true); // Skip intermediate receipt
      setIsSuccess(true);

      // Cleanup in background
      try {
        await Promise.all([
          removeSelectedItems(),
          clearCheckoutData()
        ]);
      } catch (cleanupErr) {
        if (__DEV__) console.warn('⚠️ [handlePlaceCODOrder] Cleanup warning:', cleanupErr);
      }

      // Navigation is now handled by SuccessCelebration onComplete

    } catch (error: any) {
      if (__DEV__) console.error('Error placing COD order:', error);
      errorHaptic();
      // Use a plain Alert for COD errors — NOT the payment failure modal (which is only for Stripe)
      const errorMsg = error.message || t('checkout.failedToProcess');
      Alert.alert(t('checkout.orderFailed'), errorMsg, [{ text: t('common.ok') }]);
      // Reset idempotency key on error to allow retry
      setOrderIdempotencyKey(null);
      // Reset order placed flag on error if it was set (though unlikely here)
      setIsOrderPlaced(false);
      setIsSuccess(false);
      setIsProcessing(false);
    } finally {
      // Don't turn off processing here if successful, let the popup handle it
      // But if we failed (error caught above sets it false), safe to ensure check
      // For success case, setIsProcessing(false) is called in onComplete
    }
  };

  // Handle place order button click
  const handlePlaceOrder = async () => {
    if (__DEV__) console.log('🔘 [handlePlaceOrder] Button clicked! isProcessing:', isProcessing, 'paymentMethod:', paymentMethod);
    // Prevent duplicate submissions
    if (isProcessing) {
      if (__DEV__) console.warn('⚠️ [handlePlaceOrder] Blocked — isProcessing is true');
      return;
    }

    if (paymentMethod === 'cod') {
      if (__DEV__) console.log('💰 [handlePlaceOrder] COD path → calling handlePlaceCODOrder');
      await handlePlaceCODOrder();
    } else if (paymentMethod === 'online') {
      if (__DEV__) console.log('💳 [handlePlaceOrder] Online path');
      if (!paymentIntentClientSecret) {
        // Create payment intent first
        await handleCreatePaymentIntent();
      } else {
        // Payment intent already created, payment should be handled by StripePaymentButton
        // This shouldn't happen, but just in case
        showToast({
          message: t('checkout.usePaymentButton'),
          type: 'info',
          duration: 3000,
        });
      }
    } else {
      if (__DEV__) console.warn('⚠️ [handlePlaceOrder] No payment method selected! paymentMethod =', paymentMethod);
    }
  };

  // Reset payment intent when payment method changes
  useEffect(() => {
    if (paymentMethod !== 'online') {
      setPaymentIntentClientSecret(null);
      setPaymentIntentId(null);
      setCreatedOrderId(null);
    }
  }, [paymentMethod]);

  // Prevent navigation during payment processing
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // Never block navigation on the success screen
        if (showPostOrderConfirmation) return;
        if (isProcessing || isCreatingPaymentIntent) {
          // Prevent navigation during payment
          e.preventDefault();
          warningHaptic();
          showToast({
            message: t('checkout.pleaseWaitPayment'),
            type: 'warning',
            duration: 3000,
          });
        }
      });

      return unsubscribe;
    }, [navigation, isProcessing, isCreatingPaymentIntent, showToast, showPostOrderConfirmation])
  );

  // Function to handle error field navigation
  const handleErrorFieldPress = (fieldName: string) => {
    // Navigate to the appropriate step based on field name
    if (['street', 'city', 'postalCode', 'instructions'].includes(fieldName)) {
      setCurrentStep('delivery');
    } else if (fieldName === 'pickupPoint') {
      setCurrentStep('delivery');
    } else if (fieldName === 'paymentMethod') {
      setCurrentStep('payment');
    }
    // Scroll to field would be handled by the form component
    // For now, we just navigate to the step
  };

  // Move to payment step when payment intent is created
  useEffect(() => {
    if (paymentIntentClientSecret && paymentMethod === 'online' && currentStep === 'review') {
      // Small delay to ensure state is updated
      setTimeout(() => {
        setCurrentStep('payment');
      }, 500);
    }
  }, [paymentIntentClientSecret, paymentMethod]);

  if (selectedItems.length === 0 && !isOrderPlaced) { // Check isOrderPlaced
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.tertiary }}>
        <AppHeader title={t('checkout.title')} showBack showCart={false} />
        <View className="flex-1 justify-center items-center px-8">
          <EmptyState
            icon="cart-off"
            title={t('cart.empty')}
            message={t('checkout.emptyMessage')}
            actionLabel={t('checkout.continueShopping')}
            onAction={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  const stepIndicatorContent = useMemo(() => {
    return (
      <View style={{ backgroundColor: colors.background.default, paddingTop: padding.vertical, paddingBottom: 16 }}>
        <View style={{ marginHorizontal: padding.horizontal }}>
          {/* Progress Bar Background */}
          <View style={{ height: 4, backgroundColor: colors.neutral[200], borderRadius: 2, marginBottom: 16, position: 'relative' }}>
            {/* Active Progress */}
            <View
              style={{
                height: '100%',
                backgroundColor: colors.primary[500],
                borderRadius: 2,
                width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
              }}
            />
          </View>

          {/* Steps Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {steps.map((step, index) => {
              const isActive = step.key === currentStep;
              const isCompleted = currentStepIndex > index;
              const isAccessible = currentStepIndex >= index;

              return (
                <TouchableOpacity
                  key={step.key}
                  onPress={() => isAccessible && setCurrentStep(step.key)}
                  disabled={!isAccessible}
                  style={{ alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isActive ? colors.primary[500] : isCompleted ? colors.success[500] : colors.neutral[300],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                      borderWidth: isActive ? 4 : 0,
                      borderColor: isActive ? colors.primary[100] : 'transparent',
                    }}
                  >
                    {isCompleted ? (
                      <Icon name="check" size={14} color="white" />
                    ) : (
                      <Text style={{
                        fontSize: 10,
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <Text style={{
                    fontSize: 12,
                    color: isActive ? colors.primary[700] : colors.neutral[500],
                    fontWeight: isActive ? '700' : '500',
                  }}>
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, [currentStep, currentStepIndex, steps, padding]);

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 'summary':
        return (
          <AnimatedView
            animation="fade"
            delay={0}
            style={{
              paddingHorizontal: padding.horizontal,
              paddingTop: padding.vertical,
              maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
              alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
            }}
          >
            <OrderSummary
              items={selectedItems}
              subtotal={cartSummary.subtotalValue}
              deliveryFee={cartSummary.deliveryFeeValue}
              paymentFee={cartSummary.paymentFeeValue}
              total={cartSummary.totalValue}
              country={country}
              showTotal={false}
            />
          </AnimatedView>
        );

      case 'delivery':
        return (
          <AnimatedView
            animation="slide"
            delay={0}
            enterFrom="right"
            style={{
              paddingHorizontal: padding.horizontal,
              paddingTop: padding.vertical,
              maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
              alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
            }}
          >
            {/* Delivery Method Toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setDeliveryMethod('home')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: deliveryMethod === 'home' ? colors.white : 'transparent',
                  borderRadius: 8,
                  shadowColor: deliveryMethod === 'home' ? '#000' : 'transparent',
                  shadowOpacity: deliveryMethod === 'home' ? 0.1 : 0,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: deliveryMethod === 'home' ? 2 : 0,
                }}
              >
                <Text style={{ fontWeight: '600', color: deliveryMethod === 'home' ? colors.primary[500] : '#6b7280' }}>
                  {t('checkout.homeDelivery')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeliveryMethod('pickup')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: deliveryMethod === 'pickup' ? colors.white : 'transparent',
                  borderRadius: 8,
                  shadowColor: deliveryMethod === 'pickup' ? '#000' : 'transparent',
                  shadowOpacity: deliveryMethod === 'pickup' ? 0.1 : 0,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: deliveryMethod === 'pickup' ? 2 : 0,
                }}
              >
                <Text style={{ fontWeight: '600', color: deliveryMethod === 'pickup' ? colors.primary[500] : '#6b7280' }}>
                  {t('checkout.pickupPoint')}
                </Text>
              </TouchableOpacity>
            </View>

            {deliveryMethod === 'home' ? (
              <>
                {/* Saved address selector */}
                {savedAddresses.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                      Saved Addresses
                    </Text>
                    <FlatList
                      data={savedAddresses}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={{ gap: 10 }}
                      renderItem={({ item }) => {
                        const isSelected = selectedAddressId === item.id;
                        return (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedAddressId(item.id);
                              setDeliveryAddress(prev => ({
                                ...prev,
                                street: item.street || '',
                                city: item.city || '',
                                postalCode: item.postal_code || '',
                                instructions: item.instructions || prev.instructions,
                                latitude: item.latitude,
                                longitude: item.longitude,
                              }));
                            }}
                            style={{
                              borderWidth: 1.5,
                              borderColor: isSelected ? colors.primary[500] : '#e5e7eb',
                              borderRadius: 10,
                              padding: 12,
                              backgroundColor: isSelected ? colors.primary[50] : colors.white,
                              minWidth: 180,
                              maxWidth: 220,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                              <Icon
                                name={isSelected ? 'map-marker' : 'map-marker-outline'}
                                size={16}
                                color={isSelected ? colors.primary[600] : '#6b7280'}
                              />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary[700] : '#374151' }}>
                                {item.type || 'Address'}
                                {item.is_default ? '  ★' : ''}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151' }} numberOfLines={1}>
                              {item.street}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={1}>
                              {item.city}{item.postal_code ? `, ${item.postal_code}` : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                <DeliveryAddressForm
                  street={deliveryAddress.street}
                  city={deliveryAddress.city}
                  postalCode={deliveryAddress.postalCode}
                  instructions={deliveryAddress.instructions}
                  onStreetChange={(text) =>
                    setDeliveryAddress({ ...deliveryAddress, street: text })
                  }
                  onCityChange={(text) =>
                    setDeliveryAddress({ ...deliveryAddress, city: text })
                  }
                  onPostalCodeChange={(text) =>
                    setDeliveryAddress({ ...deliveryAddress, postalCode: text })
                  }
                  onInstructionsChange={(text) =>
                    setDeliveryAddress({ ...deliveryAddress, instructions: text })
                  }
                  onLocationChange={(loc) =>
                    setDeliveryAddress(prev => ({
                      ...prev,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      street: loc.address ?? '',
                      city: loc.city ?? '',
                      postalCode: loc.postalCode ?? '',
                    }))
                  }
                  errors={validationErrors}
                  country={country}
                />

                {/* Visual feedback that phone is taken from profile */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
                  <Icon name="information-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Using phone number from your account: {user?.phone}
                  </Text>
                </View>

                <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="truck-delivery" size={20} color={colors.primary[600]} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
                      {t('checkout.nearestPickupPoint')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 20 }}>
                    {t('checkout.backupPickupPointNote')}
                  </Text>

                  <PickupPointSelector
                    pickupPoints={pickupPoints}
                    selectedPickupPointId={selectedPickupPointId}
                    onSelectPickupPoint={setSelectedPickupPointId}
                    isHomeDelivery={false} // Always show full list, not simplified view
                    onToggleHomeDelivery={(isHome) => setDeliveryMethod(isHome ? 'home' : 'pickup')}
                    country={country}
                    hideToggle={true}
                  />
                </View>
              </>
            ) : (
              <PickupPointSelector
                pickupPoints={pickupPoints}
                selectedPickupPointId={selectedPickupPointId}
                onSelectPickupPoint={setSelectedPickupPointId}
                isHomeDelivery={false}
                onToggleHomeDelivery={(isHome) => setDeliveryMethod(isHome ? 'home' : 'pickup')}
                country={country}
                hideToggle={true} // We use our own toggle above
              />
            )}
          </AnimatedView>
        );

      case 'payment':
        return (
          <AnimatedView
            animation="slide"
            delay={0}
            enterFrom="right"
            style={{
              paddingHorizontal: padding.horizontal,
              paddingTop: padding.vertical,
              maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
              alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
            }}
          >
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelectMethod={setPaymentMethod}
            />

            <View style={{
              marginTop: 24,
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.text.primary,
                marginBottom: 16,
              }}>
                {t('common.phoneNumber')}
              </Text>
              <Input
                placeholder={country === COUNTRIES.GERMANY ? "123 4567890" : "12 34 56 78"}
                value={phoneNumber}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '');
                  const maxLength = country === COUNTRIES.GERMANY ? 11 : 8;
                  if (digits.length > maxLength) return;

                  setPhoneNumber(digits);
                  if (validationErrors.phone) {
                    setValidationErrors({ ...validationErrors, phone: '' });
                  }
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={validationErrors.phone}
                validateOnChange={false} // Validation on Save
                showSuccess={phoneNumber.length > 5}
                onValidate={(val) => {
                  if (!val) return t('errors.fillAllFields');
                  const fullPhone = `${country === COUNTRIES.GERMANY ? '+49' : '+45'}${val}`;
                  const validation = validatePhoneNumberForCountry(fullPhone, country);
                  return validation.isValid ? undefined : validation.error;
                }}
                helperText={t('checkout.phoneNote')}
                leftIcon={
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="phone-outline" size={20} color={colors.neutral[400]} />
                    <Text style={{ marginLeft: 8, fontSize: 16, color: colors.neutral[900], fontWeight: '600' }}>
                      {country === COUNTRIES.GERMANY ? '+49' : '+45'}
                    </Text>
                    <View style={{ width: 1, height: 20, backgroundColor: colors.neutral[200], marginLeft: 8 }} />
                  </View>
                }
                style={{ height: 50 }}
              />
            </View>

            {paymentMethod === 'online' && (
              <View style={{ marginTop: 24, alignItems: 'center', padding: 20, backgroundColor: colors.primary[50], borderRadius: 16 }}>
                <Icon name="shield-check-outline" size={48} color={colors.primary[500]} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.neutral[900], marginTop: 12, textAlign: 'center' }}>
                  {t('checkout.secureOnlinePayment')}
                </Text>
                <Text style={{ fontSize: 14, color: colors.neutral[600], marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                  {t('checkout.secureOnlinePaymentNote')}
                </Text>
              </View>
            )}
          </AnimatedView>
        );

      case 'review':
        return (
          <AnimatedView
            animation="fade"
            delay={0}
            style={{
              paddingHorizontal: padding.horizontal,
              paddingTop: padding.vertical,
              maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
              alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
            }}
          >
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-lg font-bold text-neutral-900 mb-4">
                {t('checkout.orderSummary')}
              </Text>
              <OrderSummary
                items={selectedItems}
                subtotal={cartSummary.subtotalValue}
                deliveryFee={cartSummary.deliveryFeeValue}
                paymentFee={cartSummary.paymentFeeValue}
                total={cartSummary.totalValue}
                country={country}
              />
            </View>

            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-lg font-bold text-neutral-900 mb-4">
                {t('checkout.deliveryInformation')}
              </Text>
              {isHomeDelivery ? (
                <View>
                  <Text className="text-sm text-neutral-600 mb-1">{t('checkout.address')}</Text>
                  <Text className="text-base text-neutral-900 mb-3">
                    {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.postalCode}
                  </Text>
                  {deliveryAddress.instructions && (
                    <>
                      <Text className="text-sm text-neutral-600 mb-1">{t('checkout.instructions')}</Text>
                      <Text className="text-base text-neutral-900">{deliveryAddress.instructions}</Text>
                    </>
                  )}
                </View>
              ) : (
                <View>
                  <Text className="text-sm text-neutral-600 mb-1">{t('checkout.pickupPoint')}</Text>
                  <Text className="text-base text-neutral-900">
                    {selectedPickupPoint?.name || t('checkout.notSelected')}
                  </Text>
                </View>
              )}
            </View>

            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-lg font-bold text-neutral-900 mb-4">
                {t('checkout.paymentMethod')}
              </Text>
              <Text className="text-base text-neutral-900 capitalize mb-2">
                {paymentMethod === 'online' ? t('checkout.onlinePaymentStripe') : paymentMethod === 'cod' ? t('checkout.cashOnDelivery') : t('checkout.notSelected')}
              </Text>
              {paymentMethod === 'online' && paymentIntentClientSecret && (
                <Text className="text-sm text-success-600 mt-2">
                  ✓ {t('checkout.paymentReady')}
                </Text>
              )}
            </View>

            {/* Trust & Security Badges */}
            <View className="bg-white rounded-xl p-4">
              <Text className="text-lg font-bold text-neutral-900 mb-4">
                {t('checkout.securityTrust')}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <TrustBadge type="ssl" size="md" />
                <TrustBadge type="secure-payment" size="md" />
                <TrustBadge type="money-back" size="md" />
                <TrustBadge type="verified" size="md" />
              </View>
              <View className="flex-row gap-4 mt-4">
                <TouchableOpacity
                  onPress={() => {
                    Linking.openURL('https://thamili.com/privacy-policy').catch(() => {
                      showToast({
                        message: t('checkout.couldNotOpenPrivacy'),
                        type: 'error',
                        duration: 3000,
                      });
                    });
                  }}
                  accessibilityRole="link"
                  accessibilityLabel="View privacy policy"
                  accessibilityHint="Opens privacy policy in browser"
                >
                  <Text className="text-sm text-primary-500 underline">
                    {t('checkout.privacyPolicy')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Linking.openURL('https://thamili.com/terms').catch(() => {
                      showToast({
                        message: t('checkout.couldNotOpenTerms'),
                        type: 'error',
                        duration: 3000,
                      });
                    });
                  }}
                  accessibilityRole="link"
                  accessibilityLabel="View terms and conditions"
                  accessibilityHint="Opens terms and conditions in browser"
                >
                  <Text className="text-sm text-primary-500 underline">
                    {t('checkout.termsOfService')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedView>
        );

      default:
        return null;
    }
  }, [currentStep, selectedItems, cartSummary, country, padding, isTabletDevice, isLandscapeMode,
      deliveryMethod, deliveryAddress, selectedPickupPointId, pickupPoints, savedAddresses,
      selectedAddressId, validationErrors, paymentMethod, phoneNumber, isHomeDelivery,
      selectedPickupPoint, paymentIntentClientSecret, t]);

  const checkoutScrollContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: totalTabBarHeight + (isTabletDevice ? 120 : 100),
        paddingHorizontal: isTabletDevice && !isLandscapeMode ? padding.horizontal * 2 : padding.horizontal,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      scrollEventThrottle={16}
      overScrollMode="never"
    >
      {!cartValidation.isValid && currentStep === 'summary' && (
        <AnimatedView animation="fade" delay={0} style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <ErrorMessage

            message={cartValidation.errors.join(', ')}
            type="warning"
          />
        </AnimatedView>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <AnimatedView animation="fade" delay={0} style={{ paddingHorizontal: padding.horizontal, paddingTop: padding.vertical }}>
          <FormErrorSummary
            errors={validationErrors}
            onErrorPress={handleErrorFieldPress}
          />
        </AnimatedView>
      )}

      <View style={{ flex: 1 }} pointerEvents="box-none">
        {stepContent}
      </View>
    </ScrollView>
  );

  // Construct mock order object for immediate feedback
  const confirmedOrder = useMemo(() => {
    if (!isOrderPlaced) return null;
    return {
      id: createdOrderId || 'ORDER-ID',
      created_at: new Date().toISOString(),
      order_date: new Date().toISOString(), // Added missing field
      status: 'pending',
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
      total_amount: cartSummary.totalValue,
      country: country, // Added missing field
      user_id: user?.id || '',
      updated_at: new Date().toISOString(),
      currency: 'EUR', // Default currency
      subtotal: cartSummary.subtotalValue,
      delivery_fee: cartSummary.deliveryFeeValue,
      payment_fee: cartSummary.paymentFeeValue,
      discount_amount: 0,
      notes: deliveryAddress.instructions,
      delivery_address: deliveryAddress.street + ', ' + deliveryAddress.city, // simplified for mock
      delivery_method: deliveryMethod, // Added missing field
    } as unknown as Order; // Cast to unknown first to avoid strict overlap check issues if minor props missing
  }, [isOrderPlaced, createdOrderId, paymentMethod, cartSummary, user, deliveryAddress, country, deliveryMethod]);

  const confirmedOrderItems = useMemo(() => {
    if (!isOrderPlaced) return [];
    // Use snapshotOrderItems (captured before removeSelectedItems) so receipt
    // always has the full item list even after cart cleanup.
    const itemsSource = snapshotOrderItems.length > 0 ? snapshotOrderItems : selectedItems;
    return itemsSource.map(item => {
      // Determine price based on country
      const priceKey = `price_${country}` as keyof typeof item.product;
      const price = Number(item.product[priceKey]) || 0;

      return {
        id: 'temp-' + item.product.id,
        order_id: createdOrderId || 'ORDER-ID',
        product_id: item.product.id,
        quantity: item.quantity,
        price: price,
        subtotal: price * item.quantity,
        product: item.product,
        created_at: new Date().toISOString()
      };
    }) as (OrderItem & { product?: any })[];
  }, [isOrderPlaced, snapshotOrderItems, selectedItems, createdOrderId, country]);

  const orderConfirmationContent = useMemo(() => {
    if (!confirmedOrder) return null;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: padding.vertical,
            paddingBottom: 100, // Space for footer
            maxWidth: isTabletDevice ? 600 : '100%',
            alignSelf: isTabletDevice ? 'center' : 'stretch',
          }}
        >
          <OrderReceipt
            order={confirmedOrder}
            orderItems={confirmedOrderItems}
            country={country}
          />
        </ScrollView>

        <View style={{
          padding: padding.horizontal,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 16,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200]
        }}>
          <Text style={{ textAlign: 'center', color: colors.neutral[500], fontSize: 12 }}>
            {t('checkout.redirectingToCart')}
          </Text>
        </View>
      </View>
    );
  }, [confirmedOrder, confirmedOrderItems, country, padding, isTabletDevice, insets]);

  // Post Order Confirmation View
  const postOrderConfirmationView = useMemo(() => {
    if (!showPostOrderConfirmation) return null;

    return (
      <View style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
        <AppHeader
          title={t('checkout.orderPlaced')}
          showBack={true}
          onPressBack={handleOrderSuccessBack}
          showCart={false}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 80,
            maxWidth: isTabletDevice ? 600 : '100%',
            alignSelf: isTabletDevice ? 'center' : 'stretch',
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero Section ── */}
          <View style={{
            backgroundColor: colors.white,
            marginHorizontal: 16,
            marginTop: 20,
            borderRadius: 20,
            alignItems: 'center',
            paddingVertical: 32,
            paddingHorizontal: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}>
            {/* Single green checkmark — large, clean */}
            <View style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: '#E8F9EE',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Icon name="check-bold" size={48} color="#22C55E" />
            </View>

            <Text style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#111827',
              textAlign: 'center',
              letterSpacing: -0.3,
            }}>
              {t('checkout.orderPlacedTitle')}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              marginTop: 6,
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {t('checkout.orderPlacedMessage')}
            </Text>

            {/* Order ID chip */}
            {confirmedOrder && (
              <View style={{
                marginTop: 20,
                backgroundColor: '#F3F4F6',
                borderRadius: 100,
                paddingHorizontal: 16,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icon name="receipt" size={14} color="#6B7280" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', letterSpacing: 0.5 }}>
                  Order #{confirmedOrder.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* ── Receipt Card ── */}
          {confirmedOrder && (
            <View style={{
              backgroundColor: colors.white,
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}>
              <OrderReceipt
                order={confirmedOrder}
                orderItems={confirmedOrderItems}
                country={country}
              />
            </View>
          )}
        </ScrollView>

        {/* ── Footer countdown ── */}
        <View style={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        }}>
          {/* Auto-redirect countdown removed as per user request */}
        </View>
      </View>
    );
  }, [showPostOrderConfirmation, confirmedOrder, confirmedOrderItems, country, isTabletDevice, insets, t, countdown, handleOrderSuccessBack]);

  // Auto-redirect timer removed as per user request to keep page stable (staple)
  // Only manual back navigation is now allowed

  // Android hardware back button handler on success screen
  useEffect(() => {
    if (!showPostOrderConfirmation) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleOrderSuccessBack();
      return true;
    });
    return () => sub.remove();
  }, [showPostOrderConfirmation, handleOrderSuccessBack]);


  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      {showPostOrderConfirmation ? postOrderConfirmationView : (
        <>
          <AppHeader title={t('checkout.title')} showBack={!isOrderPlaced} showCart={false} />

          {!isOrderPlaced && (
            <CheckoutProgressIndicator
              currentStep={currentStep}
              steps={steps}
              onStepPress={(step) => {
                const stepIndex = steps.findIndex((s) => s.key === step);
                const currentIndex = getCurrentStepIndex();
                // Allow going back or to completed steps
                if (stepIndex <= currentIndex) {
                  setCurrentStep(step);
                }
              }}
              style={{ margin: padding.horizontal, marginBottom: 16 }}
            />
          )}

          {isOrderPlaced && !showPostOrderConfirmation ? ( // Only show intermediate receipt if NOT showing post-order confirmation
            orderConfirmationContent
          ) : Platform.OS !== 'web' ? (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              {checkoutScrollContent}
            </KeyboardAvoidingView>
          ) : (
            <View style={{ flex: 1 }}>{checkoutScrollContent}</View>
          )}

          {/* Sticky Navigation Buttons - Positioned above tab bar - Hide when order placed */}
          {!isOrderPlaced && (
            <AnimatedView
              animation="slide"
              delay={0}
              enterFrom="bottom"
              style={[
                styles.navigationContainer,
                {
                  bottom: 0,
                  paddingBottom: Math.max(insets.bottom, 16),
                  paddingHorizontal: padding.horizontal,
                  maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
                  alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
                }
              ] as any}
            >
              <View style={[
                styles.buttonRow,
                {
                  flexDirection: 'row', // Fixed to row for clearer Layout
                  gap: 12,
                  alignItems: 'center',
                }
              ]}>


                {/* Action Button - Prominent */}
                {currentStep === 'review' ? (
                  <Button
                    title={
                      paymentMethod === 'online'
                        ? t('checkout.payAmount', { amount: cartSummary.total })
                        : t('checkout.completeOrderAmount', { amount: cartSummary.total })
                    }
                    onPress={handlePlaceOrder}
                    loading={isProcessing || isCreatingPaymentIntent}
                    disabled={isProcessing || isCreatingPaymentIntent}
                    style={{
                      flex: 1,
                      borderRadius: 50,
                      backgroundColor: colors.primary[600],
                      shadowColor: colors.primary[500],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                      paddingVertical: 14,
                    } as any}
                    textStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }}
                    icon={<Icon name={paymentMethod === 'online' ? "lock" : "check"} size={20} color="white" />}
                  />
                ) : (
                  <Button
                    title={t('common.next')}
                    onPress={handleNext}
                    disabled={!canProceedToNextStep()}
                    style={{
                      flex: 1,
                      borderRadius: 50,
                      backgroundColor: canProceedToNextStep() ? colors.primary[600] : colors.neutral[300],
                      elevation: canProceedToNextStep() ? 4 : 0,
                      paddingVertical: 14,
                    } as any}
                    textStyle={{ fontSize: 16, fontWeight: 'bold' }}
                    icon={<Icon name="arrow-right" size={20} color="white" />}
                  />
                )}
              </View>
            </AnimatedView>
          )}

          {/* {isProcessing && <LoadingOverlay visible={isProcessing} message="Processing your order..." />} */}
        </>
      )}

      <SuccessCelebration
        visible={isSuccess}
        message={t('checkout.orderSuccessful')}
        duration={2000}
        skipExitAnimation={true}
        onComplete={() => {
          // Defer cleanup to PostOrderConfirmationView (timer or button)
          // so that we can still display the items in the receipt

          setIsSuccess(false);
          setIsProcessing(false);
          setIsCreatingPaymentIntent(false);
          setShowPostOrderConfirmation(true);
        }}
      />

      {/* Payment Processing Overlay */}
      <PaymentProcessingOverlay
        visible={(isProcessing || isCreatingPaymentIntent) && !isSuccess}
        message={
          isCreatingPaymentIntent
            ? t('checkout.initializingPayment')
            : isProcessing
              ? t('checkout.processingPayment')
              : t('common.processing')
        }
        showCancel={false}
      />

      <PaymentFailureModal
        visible={isPaymentFailureVisible}
        error={paymentError}
        onClose={() => setIsPaymentFailureVisible(false)}
        onRetry={() => {
          setIsPaymentFailureVisible(false);
          handleCreatePaymentIntent();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRow: {
    // flexDirection is set dynamically based on screen size
  },
  backButton: {
    // flex and width are set dynamically
  },
  nextButton: {
    // flex and width are set dynamically
  },
});

export default CheckoutScreen;
