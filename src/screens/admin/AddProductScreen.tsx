import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, StatusBar, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, ProductCategory } from '../../types';
import { productService } from '../../services/productService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useLoading } from '../../contexts/LoadingContext';
import { Input, Button, ErrorMessage, SuccessCelebration } from '../../components';
import { PRODUCT_CATEGORIES } from '../../constants';
import { isTablet, isSmallDevice, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  requestMediaLibraryPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
} from 'expo-image-picker';

type AddProductScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddProduct'>;

const AddProductScreen = () => {
  const navigation = useNavigation<AddProductScreenNavigationProp>();
  const loading = useLoading();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const padding = getResponsivePadding();
  const insets = useSafeAreaInsets();

  const STEPS = [
    { id: 1, title: t('admin.productForm.details'), icon: 'file-document-outline' },
    { id: 2, title: t('admin.productForm.pricing'), icon: 'currency-eur' },
    { id: 3, title: t('admin.productForm.stock'), icon: 'cube-outline' },
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('fresh');
  const [sellType, setSellType] = useState<'pack' | 'loose'>('pack');
  const [packSizeGrams, setPackSizeGrams] = useState('');
  const [priceGermany, setPriceGermany] = useState('');
  const [priceDenmark, setPriceDenmark] = useState('');
  const [stockGermany, setStockGermany] = useState('');
  const [stockDenmark, setStockDenmark] = useState('');
  const [isGermanyEnabled, setIsGermanyEnabled] = useState(true);
  const [isDenmarkEnabled, setIsDenmarkEnabled] = useState(true);
  const [isGermanyActive, setIsGermanyActive] = useState(true);
  const [isDenmarkActive, setIsDenmarkActive] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissions.permissionRequired'),
          t('permissions.cameraRollRequired'),
          [{ text: t('common.ok') }]
        );
      }
    })();
  }, []);

  const createMutation = useMutation({
    mutationFn: async (productData: any) => {
      let imageUrl = null;
      if (imageUri) {
        setUploading(true);
        setUploadProgress(0);
        try {
          console.log('[AddProduct] Starting image upload...');
          console.log('[AddProduct] Image URI:', imageUri);
          imageUrl = await productService.uploadProductImage(
            imageUri,
            (progress) => {
              setUploadProgress(progress);
              console.log(`[AddProduct] Upload progress: ${progress}%`);
            },
            loading
          );
          console.log('[AddProduct] ✅ Image upload successful. URL:', imageUrl);
        } catch (error: any) {
          console.error('[AddProduct] ❌ Image upload error:', error);
          console.error('[AddProduct] Error message:', error?.message);
          console.error('[AddProduct] Error stack:', error?.stack);

          // Show error alert with detailed message
          const errorMessage = error?.message || 'Failed to upload image to Supabase Storage.';
          Alert.alert(
            t('admin.productForm.imageUploadFailed'),
            `${t('admin.productForm.imageUploadError')}\n\n${t('admin.productForm.imageUploadNotice')}`,
            [{ text: t('common.continue'), style: 'default' }]
          );

          // Continue with null image URL (allow product creation without image)
          imageUrl = null;

          // Don't re-throw - allow product creation to continue without image
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }

      console.log('[AddProduct] Creating product with image URL:', imageUrl);
      return productService.createProduct(
        { ...productData, image_url: imageUrl },
        loading
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productsAll() });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      console.error('[AddProduct] Create mutation error:', error);
      console.error('[AddProduct] Error message:', error?.message);
      Alert.alert(t('common.error'), error?.message || t('admin.products.checkConnectionAndTry'));
    },
  });

  const handlePickImage = async () => {
    try {
      // Check current permission status first
      let permissionResult = await getMediaLibraryPermissionsAsync();

      // If not granted, request it
      if (permissionResult.status !== 'granted') {
        permissionResult = await requestMediaLibraryPermissionsAsync();
      }

      // If still not granted (and not limited access on iOS), show alert
      if (permissionResult.status !== 'granted') {
        Alert.alert(
          t('permissions.permissionRequired'),
          t('permissions.cameraRollRequired'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('permissions.openSettings'),
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return;
      }

      // Launch image library
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // Handle result
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert(t('common.error'), error?.message || t('admin.products.failedToPickImage'));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!name.trim()) newErrors.name = t('admin.productForm.nameRequired');
      if (sellType === 'pack') {
        if (!packSizeGrams || parseInt(packSizeGrams) <= 0) newErrors.packSizeGrams = t('admin.productForm.packSizeRequired');
      }
      if (!isGermanyEnabled && !isDenmarkEnabled) {
        newErrors.countries = t('admin.productForm.selectCountryRequired');
        Alert.alert(t('admin.productForm.selectionRequiredTitle'), t('admin.productForm.selectionRequiredMessage'));
      }
    } else if (step === 2) {
      if (isGermanyEnabled && (!priceGermany || parseFloat(priceGermany) <= 0)) newErrors.priceGermany = t('admin.productForm.priceRequired');
      if (isDenmarkEnabled && (!priceDenmark || parseFloat(priceDenmark) <= 0)) newErrors.priceDenmark = t('admin.productForm.priceRequired');
    } else if (step === 3) {
      if (isGermanyEnabled && (!stockGermany || parseInt(stockGermany) < 0)) newErrors.stockGermany = t('admin.productForm.stockRequired');
      if (isDenmarkEnabled && (!stockDenmark || parseInt(stockDenmark) < 0)) newErrors.stockDenmark = t('admin.productForm.stockRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  const handleSubmit = () => {
    if (!validateStep(3)) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      price_germany: isGermanyEnabled ? parseFloat(priceGermany) : 0,
      price_denmark: isDenmarkEnabled ? parseFloat(priceDenmark) : 0,
      stock_germany: isGermanyEnabled ? (sellType === 'loose' ? parseInt(stockGermany) / 1000 : parseInt(stockGermany)) : 0,
      stock_denmark: isDenmarkEnabled ? (sellType === 'loose' ? parseInt(stockDenmark) / 1000 : parseInt(stockDenmark)) : 0,
      active_germany: isGermanyEnabled ? isGermanyActive : false,
      active_denmark: isDenmarkEnabled ? isDenmarkActive : false,
      sell_type: sellType,
      unit: sellType === 'loose' ? 'gram' : 'packet',
      pack_size_grams: sellType === 'pack' ? parseInt(packSizeGrams) : undefined,
      active: (isGermanyEnabled && isGermanyActive) || (isDenmarkEnabled && isDenmarkActive),
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[colors.navy[800], colors.navy[600]]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.productForm.addNewProduct')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepIcon,
                  currentStep >= step.id ? styles.stepIconActive : styles.stepIconInactive
                ]}>
                  <Icon
                    name={step.icon as any}
                    size={20}
                    color={currentStep >= step.id ? colors.white : colors.navy[200]}
                  />
                </View>
                <Text style={[
                  styles.stepLabel,
                  currentStep >= step.id ? styles.stepLabelActive : styles.stepLabelInactive
                ]}>{step.title}</Text>
              </View>
              {index < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  currentStep > step.id ? styles.stepLineActive : styles.stepLineInactive
                ]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 1: return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.productForm.basicInformation')}</Text>

          <View style={styles.formGroup}>
            <Input
              label={`${t('admin.productForm.productName')} *`}
              placeholder={t('admin.productForm.namePlaceholder')}
              value={name}
              onChangeText={setName}
              error={errors.name}
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.productForm.category')}</Text>
            <View style={styles.categoryRow}>
              {[PRODUCT_CATEGORIES.FRESH, PRODUCT_CATEGORIES.FROZEN].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionActive
                  ]}
                >
                  <Icon
                    name={cat === 'fresh' ? 'fruit-cherries' : 'snowflake'}
                    size={20}
                    color={category === cat ? colors.primary[600] : colors.neutral[500]}
                  />
                  <Text style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive
                  ]}>{t(`products.${cat}`).toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.productForm.sellType')}</Text>
            <View style={styles.categoryRow}>
              {['pack', 'loose'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSellType(type as 'pack' | 'loose')}
                  style={[
                    styles.categoryOption,
                    sellType === type && styles.categoryOptionActive
                  ]}
                >
                  <Icon
                    name={type === 'pack' ? 'package-variant' : 'scale'}
                    size={20}
                    color={sellType === type ? colors.primary[600] : colors.neutral[500]}
                  />
                  <Text style={[
                    styles.categoryText,
                    sellType === type && styles.categoryTextActive
                  ]}>{type === 'pack' ? t('admin.productForm.packItem') : t('admin.productForm.looseWeight')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {sellType === 'pack' && (
            <View style={styles.formGroup}>
              <Input
                label={t('admin.productForm.packSizeGrams')}
                placeholder={t('admin.productForm.packSizePlaceholder')}
                value={packSizeGrams}
                onChangeText={setPackSizeGrams}
                keyboardType="number-pad"
                error={errors.packSizeGrams}
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Input
              label={t('admin.productForm.description')}
              placeholder={t('admin.productForm.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80 }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.productForm.countryAvailability')} *</Text>
            <View style={styles.categoryRow}>
              {[
                { id: 'germany', name: t('admin.productForm.germany'), flag: '🇩🇪' },
                { id: 'denmark', name: t('admin.productForm.denmark'), flag: '🇩🇰' }
              ].map((c) => {
                const isEnabled = c.id === 'germany' ? isGermanyEnabled : isDenmarkEnabled;
                const toggle = () => c.id === 'germany' ? setIsGermanyEnabled(!isGermanyEnabled) : setIsDenmarkEnabled(!isDenmarkEnabled);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={toggle}
                    style={[
                      styles.categoryOption,
                      isEnabled && styles.categoryOptionActive
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                    <Text style={[
                      styles.categoryText,
                      isEnabled && styles.categoryTextActive
                    ]}>{c.name}</Text>
                    <Icon
                      name={isEnabled ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                      size={20}
                      color={isEnabled ? colors.primary[600] : colors.neutral[300]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.countries && <Text style={styles.errorText}>{errors.countries}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.productForm.image')}</Text>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageSelector}>
              {imageUri ? (
                <View style={styles.imageConfig}>
                  <Icon name="check-circle" size={24} color={colors.success[500]} />
                  <Text style={styles.imageSelectedText}>{t('admin.productForm.imageSelected')}</Text>
                  <Text style={styles.imageChangeText}>{t('admin.productForm.tapToChange')}</Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="cloud-upload" size={32} color={colors.neutral[400]} />
                  <Text style={styles.imagePlaceholderText}>{t('admin.productForm.uploadImage')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
      case 2: return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.productForm.pricingStrategy')}</Text>
          <Text style={styles.cardSubtitle}>{t('admin.productForm.setPricesForRegion')}</Text>

          <View style={styles.priceRow}>
            {isGermanyEnabled && (
              <View style={styles.flex1}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionTitle}>🇩🇪 {t('admin.productForm.germany')}</Text>
                  <TouchableOpacity
                    onPress={() => setIsGermanyActive(!isGermanyActive)}
                    style={[styles.statusBadge, isGermanyActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
                  >
                    <Text style={[styles.statusBadgeText, isGermanyActive && styles.statusBadgeTextActive]}>
                      {isGermanyActive ? t('admin.products.active') : t('admin.products.inactive')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Input
                  label={t('admin.productForm.priceLabel', { currency: '€', unit: sellType === 'loose' ? '/ kg' : '/ pack' })}
                  placeholder={t('admin.productForm.pricePlaceholderDE')}
                  value={priceGermany}
                  onChangeText={setPriceGermany}
                  keyboardType="decimal-pad"
                  error={errors.priceGermany}
                  style={styles.input}
                />
              </View>
            )}
            {isDenmarkEnabled && (
              <View style={styles.flex1}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionTitle}>🇩🇰 {t('admin.productForm.denmark')}</Text>
                  <TouchableOpacity
                    onPress={() => setIsDenmarkActive(!isDenmarkActive)}
                    style={[styles.statusBadge, isDenmarkActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
                  >
                    <Text style={[styles.statusBadgeText, isDenmarkActive && styles.statusBadgeTextActive]}>
                      {isDenmarkActive ? t('admin.products.active') : t('admin.products.inactive')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Input
                  label={t('admin.productForm.priceLabel', { currency: '€', unit: sellType === 'loose' ? '/ kg' : '/ pack' })}
                  placeholder={t('admin.productForm.pricePlaceholderDK')}
                  value={priceDenmark}
                  onChangeText={setPriceDenmark}
                  keyboardType="decimal-pad"
                  error={errors.priceDenmark}
                  style={styles.input}
                />
              </View>
            )}
          </View>
        </View>
      );
      case 3: return (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('admin.productForm.inventoryManagement')}</Text>
            <View style={styles.priceRow}>
              {isGermanyEnabled && (
                <View style={styles.flex1}>
                  <Input
                    label={t('admin.productForm.stockLabel', { region: t('admin.products.geShort'), unit: sellType === 'loose' ? '(g)' : '' })}
                    placeholder="0"
                    value={stockGermany}
                    onChangeText={setStockGermany}
                    keyboardType="number-pad"
                    error={errors.stockGermany}
                    style={styles.input}
                  />
                </View>
              )}
              {isDenmarkEnabled && (
                <View style={styles.flex1}>
                  <Input
                    label={t('admin.productForm.stockLabel', { region: t('admin.products.dkShort'), unit: sellType === 'loose' ? '(g)' : '' })}
                    placeholder="0"
                    value={stockDenmark}
                    onChangeText={setStockDenmark}
                    keyboardType="number-pad"
                    error={errors.stockDenmark}
                    style={styles.input}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Summary Card */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.cardTitle}>{t('admin.productForm.reviewSummary')}</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('admin.productForm.summaryProduct')}</Text>
              <Text style={styles.summaryValue}>{name}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('admin.productForm.summaryCategory')}</Text>
              <Text style={styles.summaryValue}>{t('products.' + category)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('admin.productForm.summaryType')}</Text>
              <Text style={styles.summaryValue}>
                {sellType === 'pack' ? t('admin.productForm.packLabel', { size: packSizeGrams }) : t('admin.productForm.looseLabel')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('admin.productForm.summaryPrice')}</Text>
              <Text style={styles.summaryValue}>
                {isGermanyEnabled && `${t('admin.products.geShort')}: €${priceGermany}`}
                {isGermanyEnabled && isDenmarkEnabled && ' | '}
                {isDenmarkEnabled && `${t('admin.products.dkShort')}: €${priceDenmark}`}
              </Text>
            </View>
          </View>
        </View>
      );
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <View style={styles.footerRow}>
          {currentStep > 1 && (
            <TouchableOpacity onPress={handleBack} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t('admin.productForm.back')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={currentStep === 3 ? handleSubmit : handleNext}
            style={styles.primaryBtn}
            disabled={uploading || createMutation.isPending}
          >
            <Text style={styles.primaryBtnText}>
              {currentStep === 3
                ? (createMutation.isPending ? t('admin.productForm.creating') : t('admin.productForm.create'))
                : t('common.continue')}
            </Text>
            {currentStep < 3 && <Icon name="arrow-right" size={20} color="white" />}
          </TouchableOpacity>
        </View>
      </View>

      <SuccessCelebration
        visible={showSuccessModal}
        message={t('admin.products.productCreated')}
        onComplete={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    backgroundColor: colors.navy[800],
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 1,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  stepIconActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  stepIconInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.navy[400],
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  stepLabelActive: { color: colors.white },
  stepLabelInactive: { color: colors.navy[300] },
  stepLine: {
    width: 40,
    height: 2,
    marginTop: -16,
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: colors.primary[500] },
  stepLineInactive: { backgroundColor: colors.navy[700] },

  // Content
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy[800],
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 20,
    marginTop: -10,
  },
  formGroup: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
    flexShrink: 1,
  },
  errorText: {
    fontSize: 12,
    color: colors.error[500],
    marginTop: 4,
    fontWeight: '500',
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    gap: 8,
  },
  categoryOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  categoryTextActive: {
    color: colors.primary[700],
  },

  // Image
  imageSelector: {
    height: 120,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  imageConfig: {
    alignItems: 'center',
  },
  imageSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success[600],
    marginTop: 4,
  },
  imageChangeText: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },

  // Pricing
  priceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  flex1: { flex: 1 },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  regionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy[700],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
  },
  statusBadgeInactive: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[300],
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  statusBadgeTextActive: {
    color: colors.success[700],
  },

  // Summary
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  summaryLabel: {
    color: colors.neutral[500],
  },
  summaryValue: {
    fontWeight: '600',
    color: colors.navy[700],
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  primaryBtn: {
    backgroundColor: colors.navy[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.navy[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddProductScreen;
