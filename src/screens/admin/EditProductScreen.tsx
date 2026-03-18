import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, StatusBar, Linking } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList, ProductCategory, Product } from '../../types';
import { productService } from '../../services/productService';
import { Input, Button, ErrorMessage, LoadingScreen, SuccessCelebration } from '../../components';
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

type EditProductScreenRouteProp = RouteProp<RootStackParamList, 'EditProduct'>;
type EditProductScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProduct'>;

const EditProductScreen = () => {
  const route = useRoute<EditProductScreenRouteProp>();
  const navigation = useNavigation<EditProductScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { productId } = route.params;
  const padding = getResponsivePadding();
  const insets = useSafeAreaInsets();

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
  const [active, setActive] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.getProductById(productId),
    enabled: !!productId,
  });

  useEffect(() => {
    (async () => {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        // Silent check or optional alert, since product data loading is primary here
      }
    })();

    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setCategory(product.category);
      setPriceGermany(product.price_germany?.toString() || '0');
      setPriceDenmark(product.price_denmark?.toString() || '0');
      setStockGermany(product.sell_type === 'loose' ? (product.stock_germany * 1000).toString() : product.stock_germany?.toString() || '0');
      setStockDenmark(product.sell_type === 'loose' ? (product.stock_denmark * 1000).toString() : product.stock_denmark?.toString() || '0');
      // Initialize toggles: enabled if price or stock is present
      setIsGermanyEnabled((product.price_germany || 0) > 0 || (product.stock_germany || 0) > 0);
      setIsDenmarkEnabled((product.price_denmark || 0) > 0 || (product.stock_denmark || 0) > 0);
      setIsGermanyActive(product.active_germany ?? product.active);
      setIsDenmarkActive(product.active_denmark ?? product.active);
      setActive(product.active);
      setCurrentImageUrl(product.image_url || null);
      setSellType(product.sell_type || 'pack');
      setPackSizeGrams(product.pack_size_grams?.toString() || '');
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: async (productData: any) => {
      let imageUrl = currentImageUrl;
      if (imageUri) {
        setUploading(true);
        setUploadProgress(0);
        try {
          console.log('[EditProduct] Starting image upload...');
          imageUrl = await productService.uploadProductImage(imageUri, (progress) => {
            setUploadProgress(progress);
            console.log(`[EditProduct] Upload progress: ${progress}%`);
          });
          console.log('[EditProduct] Image upload successful. URL:', imageUrl);
        } catch (error: any) {
          console.error('[EditProduct] ❌ Image upload error:', error);
          console.error('[EditProduct] Error message:', error?.message);
          console.error('[EditProduct] Error stack:', error?.stack);

          // Show error alert with detailed message
          const errorMessage = error?.message || 'Failed to upload image to Supabase Storage.';
          Alert.alert(
            t('admin.productForm.imageUploadFailed'),
            `${errorMessage}\n\n${t('admin.productForm.uploadErrorNotice')}`,
            [{ text: t('admin.productForm.continueNoImage'), style: 'default' }]
          );

          // Keep the current image URL if upload fails (don't update image)
          imageUrl = currentImageUrl;

          // Don't re-throw - allow product update to continue with old image
          // This way user can still update other product details even if image upload fails
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }

      console.log('[EditProduct] Updating product with image URL:', imageUrl);
      return productService.updateProduct(productId, { ...productData, image_url: imageUrl });
    },
    onSuccess: (updatedProduct) => {
      console.log('[EditProduct] Product updated successfully:', updatedProduct);
      console.log('[EditProduct] New image URL:', updatedProduct?.image_url);

      // Update local state with the new image URL from the updated product
      if (updatedProduct?.image_url) {
        setCurrentImageUrl(updatedProduct.image_url);
        console.log('[EditProduct] ✅ Updated currentImageUrl to:', updatedProduct.image_url);
      } else {
        // If no image_url in response, keep current or clear it
        console.warn('[EditProduct] ⚠️ No image_url in updated product response');
      }

      // Clear the local image URI since we've uploaded it and it's now in currentImageUrl
      setImageUri(null);

      // Invalidate queries to refresh data in other screens (cart, products list, etc.)
      // This ensures all screens refetch the latest product data
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });

      // Refetch the product data immediately to ensure UI is updated
      queryClient.refetchQueries({ queryKey: ['product', productId] }).then(() => {
        console.log('[EditProduct] ✅ Product data refetched');
      }).catch((error) => {
        console.error('[EditProduct] ❌ Error refetching product data:', error);
      });

      // Also invalidate products query to refresh products list
      queryClient.invalidateQueries({ queryKey: ['products'] });

      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      console.error('[EditProduct] Update mutation error:', error);
      Alert.alert(t('common.error'), error?.message || t('admin.products.failedToUpdate'));
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

      // If still not granted, show alert
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
        setCurrentImageUrl(null);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert(t('common.error'), error?.message || t('admin.products.failedToPickImage'));
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('admin.productForm.required');
    if (!isGermanyEnabled && !isDenmarkEnabled) {
      newErrors.countries = t('admin.productForm.selectCountryRequired');
      Alert.alert(t('admin.productForm.selectionRequiredTitle'), t('admin.productForm.selectionRequiredMessage'));
    }
    if (isGermanyEnabled && (!priceGermany || parseFloat(priceGermany) <= 0)) newErrors.priceGermany = t('admin.productForm.invalid');
    if (isDenmarkEnabled && (!priceDenmark || parseFloat(priceDenmark) <= 0)) newErrors.priceDenmark = t('admin.productForm.invalid');
    if (sellType === 'pack' && (!packSizeGrams || parseInt(packSizeGrams) <= 0)) {
      newErrors.packSizeGrams = t('admin.productForm.invalidPackSize');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateMutation.mutate({
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
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.products.editProduct')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
    </View>
  );

  if (isLoading) return <LoadingScreen message={t('common.loading')} />;
  if (!product) return <ErrorMessage message={t('errors.productNotFound')} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {renderHeader()}

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info & Image Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('admin.productForm.details')}</Text>

          <View style={styles.imageSection}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
              {(imageUri || currentImageUrl) ? (
                <Image
                  source={{
                    uri: imageUri || currentImageUrl || '',
                  }}
                  style={styles.imagePreview}
                  contentFit="cover"
                  // Add cache busting for newly uploaded images
                  cachePolicy={imageUri ? 'none' : 'memory-disk'}
                  // Add placeholder for better UX
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                  transition={200}
                  // Add error handling
                  onError={(error) => {
                    console.error('[EditProduct] Image load error:', error);
                    console.error('[EditProduct] Image URI:', imageUri || currentImageUrl);
                  }}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="image-plus" size={32} color={colors.neutral[400]} />
                </View>
              )}
              <View style={styles.editIconBadge}>
                <Icon name="pencil" size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <Input
            label={t('admin.productForm.productName')}
            value={name}
            onChangeText={setName}
            error={errors.name}
            style={styles.input}
          />

          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>{t('admin.productForm.category')}</Text>
            <View style={styles.categoryRow}>
              {[PRODUCT_CATEGORIES.FRESH, PRODUCT_CATEGORIES.FROZEN].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive
                  ]}>{t(`products.${cat}`).toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>{t('admin.productForm.sellType')}</Text>
            <View style={styles.categoryRow}>
              {['pack', 'loose'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSellType(type as 'pack' | 'loose')}
                  style={[
                    styles.categoryChip,
                    sellType === type && styles.categoryChipActive
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    sellType === type && styles.categoryChipTextActive
                  ]}>{type === 'pack' ? t('admin.productForm.packItem') : t('admin.productForm.looseWeight')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {sellType === 'pack' && (
            <Input
              label={t('admin.productForm.packSizeGrams')}
              value={packSizeGrams}
              onChangeText={setPackSizeGrams}
              keyboardType="number-pad"
              error={errors.packSizeGrams}
              style={[styles.input, { marginTop: 16 }]}
            />
          )}

          <Input
            label={t('admin.productForm.description')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.input, { minHeight: 80, marginTop: 16 }]}
          />

          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>{t('admin.productForm.countryAvailability')} *</Text>
            <View style={styles.categoryRow}>
              {[
                { id: 'germany', name: t('admin.dashboard.germany'), flag: '🇩🇪' },
                { id: 'denmark', name: t('admin.dashboard.denmark'), flag: '🇩🇰' }
              ].map((c) => {
                const isEnabled = c.id === 'germany' ? isGermanyEnabled : isDenmarkEnabled;
                const toggle = () => c.id === 'germany' ? setIsGermanyEnabled(!isGermanyEnabled) : setIsDenmarkEnabled(!isDenmarkEnabled);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={toggle}
                    style={[
                      styles.categoryChip,
                      isEnabled && styles.categoryChipActive,
                      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                    <Text style={[
                      styles.categoryChipText,
                      isEnabled && styles.categoryChipTextActive
                    ]}>{c.name}</Text>
                    <Icon
                      name={isEnabled ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                      size={18}
                      color={isEnabled ? colors.primary[600] : colors.neutral[400]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.countries && <Text style={styles.errorText}>{errors.countries}</Text>}
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('admin.productForm.pricing')}</Text>
          <View style={styles.row}>
            {isGermanyEnabled && (
              <View style={styles.col}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionTitle}>🇩🇪 {t('admin.dashboard.germany')}</Text>
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
                  value={priceGermany}
                  onChangeText={setPriceGermany}
                  keyboardType="decimal-pad"
                  error={errors.priceGermany}
                  style={styles.input}
                />
              </View>
            )}
            {isDenmarkEnabled && (
              <View style={[styles.col, isGermanyEnabled && { marginLeft: 12 }]}>
                <View style={styles.regionHeader}>
                  <Text style={styles.regionTitle}>🇩🇰 {t('admin.dashboard.denmark')}</Text>
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
                  value={priceDenmark}
                  onChangeText={setPriceDenmark}
                  keyboardType="decimal-pad"
                  error={errors.priceDenmark}
                  style={styles.input}
                />
              </View>
            )}
          </View>
          {!isGermanyEnabled && !isDenmarkEnabled && (
            <Text style={styles.infoText}>{t('admin.productForm.enableOneCountry')}</Text>
          )}
        </View>

        {/* Inventory Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('admin.productForm.stock')}</Text>
          <View style={styles.row}>
            {isGermanyEnabled && (
              <View style={styles.col}>
                <Input
                  label={t('admin.productForm.stockLabel', { region: 'DE', unit: sellType === 'loose' ? '(g)' : '' })}
                  value={stockGermany}
                  onChangeText={setStockGermany}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            )}
            {isDenmarkEnabled && (
              <View style={[styles.col, isGermanyEnabled && { marginLeft: 12 }]}>
                <Input
                  label={t('admin.productForm.stockLabel', { region: 'DK', unit: sellType === 'loose' ? '(g)' : '' })}
                  value={stockDenmark}
                  onChangeText={setStockDenmark}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            )}
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('admin.productForm.status')}</Text>
              <Text style={styles.statusDescription}>
                {active ? t('admin.productForm.visible') : t('admin.productForm.hidden')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActive(!active)}
              style={[styles.toggle, active ? styles.toggleActive : styles.toggleInactive]}
            >
              <View style={[styles.toggleKnob, active ? styles.toggleKnobActive : styles.toggleKnobInactive]} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.floatButtonContainer, { bottom: insets.bottom + 20 }]}>
        <Button
          title={updateMutation.isPending ? t('common.processing') : t('admin.productForm.update')}
          onPress={handleSubmit}
          loading={updateMutation.isPending || uploading}
          style={styles.updateButton}
          textStyle={{ fontSize: 16 }}
          fullWidth
        />
      </View>

      <SuccessCelebration
        visible={showSuccessModal}
        message={t('admin.products.productUpdated')}
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  saveButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
  },

  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy[800],
    marginBottom: 16,
    flexShrink: 1,
  },

  // Image
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.neutral[100],
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.navy[600],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  // Form Elements
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
  },
  errorText: {
    fontSize: 12,
    color: colors.error[500],
    marginTop: 4,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
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

  // Category Chips
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  categoryChipTextActive: {
    color: colors.primary[700],
  },

  // Status Toggle
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 4,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 2,
  },
  toggleActive: { backgroundColor: colors.success[500] },
  toggleInactive: { backgroundColor: colors.neutral[300] },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  toggleKnobInactive: { alignSelf: 'flex-start' },

  // Float Button
  floatButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  updateButton: {
    backgroundColor: colors.navy[600],
    shadowColor: colors.navy[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 12,
  },
});

export default EditProductScreen;
