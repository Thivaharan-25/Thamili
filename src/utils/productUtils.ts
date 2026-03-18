import { Product, ProductCategory } from '../types';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';
import { formatCurrency } from './regionalFormatting';

/**
 * Format price for a specific country (uses regional formatting)
 */
export const formatPrice = (price: number | null | undefined, country: Country): string => {
  return formatCurrency(price, country);
};

/**
 * Get product price for a specific country
 * Inlined to avoid importing productService which causes "property is not configurable" errors
 * Returns 0 if price is not set or invalid
 */
export const getProductPrice = (product: Product, country: Country): number => {
  const price = country === COUNTRIES.GERMANY ? product.price_germany : product.price_denmark;
  // Validate price - return 0 if null, undefined, or NaN
  if (price === null || price === undefined || isNaN(price) || price < 0) {
    console.warn(`Product ${product.id} has invalid price for ${country}:`, price);
    return 0;
  }
  return price;
};

/**
 * Get product stock for a specific country
 */
export const getProductStock = (product: Product, country: Country): number => {
  return country === COUNTRIES.GERMANY ? product.stock_germany : product.stock_denmark;
};

/**
 * Check if product is in stock for a specific country
 */
export const isInStock = (product: Product, country: Country): boolean => {
  const stock = getProductStock(product, country);
  const isLoose = isProductWeightBased(product);
  
  if (isLoose) {
    // Loose items (stock in KG) are out of stock if less than 100g (0.1kg)
    return stock >= 0.1;
  }
  
  // Pack items (stock in KG, needs to be converted to packets)
  const packSizeKg = (product.pack_size_grams || 1000) / 1000;
  return Math.floor(stock / packSizeKg) > 0;
};

/**
 * Filter products by category
 */
export const filterByCategory = (
  products: Product[],
  category: ProductCategory | 'all'
): Product[] => {
  if (category === 'all') {
    return products;
  }
  return products.filter((product) => product.category === category);
};

/**
 * Sort products
 */
export const sortProducts = (
  products: Product[],
  sortBy: 'name' | 'price_asc' | 'price_desc',
  country: Country
): Product[] => {
  const sorted = [...products];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'price_asc':
      return sorted.sort(
        (a, b) =>
          getProductPrice(a, country) - getProductPrice(b, country)
      );
    case 'price_desc':
      return sorted.sort(
        (a, b) =>
          getProductPrice(b, country) - getProductPrice(a, country)
      );
    default:
      return sorted;
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = (
  products: Product[],
  searchQuery: string
): Product[] => {
  if (!searchQuery.trim()) {
    return products;
  }

  const query = searchQuery.toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(query) ||
      (product.description &&
        product.description.toLowerCase().includes(query))
  );
};

/**
 * Get filtered and sorted products
 */
export const getFilteredProducts = (
  products: Product[],
  options: {
    category?: ProductCategory | 'all';
    searchQuery?: string;
    sortBy?: 'name' | 'price_asc' | 'price_desc';
    country: Country;
    hideUnavailable?: boolean;
  }
): Product[] => {
  let filtered = products;

  // Filter by category
  if (options.category) {
    filtered = filterByCategory(filtered, options.category);
  }

  // Filter by country availability and regional active status
  if (options.hideUnavailable) {
    filtered = filtered.filter(p => {
      const isGermany = options.country === COUNTRIES.GERMANY;
      const isDenmark = options.country === COUNTRIES.DENMARK;
      
      const regionalActive = isGermany ? p.active_germany : isDenmark ? p.active_denmark : false;
      const price = isGermany ? p.price_germany : p.price_denmark;
      const stock = isGermany ? p.stock_germany : p.stock_denmark;
      
      // A product is available in a region if:
      // 1. It is active in that specific region
      // 2. It has a price > 0
      // (Global 'active' flag is ignored for specific regional availability if regional flags are set)
      return (regionalActive !== false) && (price || 0) > 0;
    });
  }

  // Search
  if (options.searchQuery) {
    filtered = searchProducts(filtered, options.searchQuery);
  }

  // Sort
  if (options.sortBy) {
    filtered = sortProducts(filtered, options.sortBy, options.country);
  }

  return filtered;
};


/**
 * Check if a product is weight-based (loose) or piece-based (pack)
 */
export const isProductWeightBased = (product?: { sell_type?: string; unit?: string; category?: string }): boolean => {
  if (!product) return true; // Default to loose for safety
  
  // 1. Explicit sell_type (Highest priority)
  if (product.sell_type === 'loose') return true;
  if (product.sell_type === 'pack') return false;
  
  // 2. Unit check (Higher priority than category)
  const unit = product.unit?.toLowerCase();
  const weightUnits = ['gram', 'kg', 'g', 'kilogram'];
  const pieceUnits = ['packet', 'pkt', 'piece', 'pc', 'packets', 'pieces', 'box', 'bottle'];
  
  if (unit && weightUnits.includes(unit)) return true;
  if (unit && pieceUnits.includes(unit)) return false;
  
  // 3. Category fallback
  const category = product.category?.toLowerCase();
  if (category === 'fresh' || category === 'frozen') {
    // Check if unit suggests it's actually a pack (e.g. "Frozen Peas 500g Packet")
    if (unit && pieceUnits.some(u => unit.includes(u))) return false;
    return true;
  }
  
  return false; // Default to packets/pieces
};


/**
 * Get unit label for a product (e.g. /kg, /packet)
 */
export const getItemUnitLabel = (product?: { sell_type?: string; unit?: string; category?: string }): string => {
  if (!product) return '';
  const isWeightBased = isProductWeightBased(product);
  return isWeightBased ? '/kg' : '/packet';
};

/**
 * Convert packet count to weight (KG)
 */
export const packetsToWeight = (count: number, packSizeGrams: number = 0): number => {
  if (packSizeGrams <= 0) return count; // Default to 1 unit = 1kg if not specified
  return count * (packSizeGrams / 1000);
};

/**
 * Convert weight (KG) to max available packets
 */
export const weightToPackets = (weight: number, packSizeGrams: number = 0): number => {
  if (packSizeGrams <= 0) return Math.floor(weight);
  return Math.floor(weight / (packSizeGrams / 1000));
};

/**
 * Format quantity with units
 */
export const formatItemQuantity = (quantity: number, product?: { sell_type?: string; unit?: string; category?: string; pack_size_grams?: number }): string => {
  const isLoose = isProductWeightBased(product);

  if (isLoose) {
    if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(2)} kg`;
    }
    return `${Math.round(quantity)} g`;
  }

  // Pack items
  const packetCount = Math.round(quantity);
  const unit = product?.unit || 'packet';
  const packSize = product?.pack_size_grams;
  
  if (packSize && packSize > 0) {
    return `${packetCount} ${packetCount === 1 ? unit : unit + 's'} (${packSize}g)`;
  }
  
  return `${packetCount} ${packetCount === 1 ? unit : unit + 's'}`;
};

/**
 * Calculate numeric subtotal for an item, handling legacy fractional packet quantities
 */
export const calculateItemSubtotalValue = (quantity: number, price: number, product?: { sell_type?: string; unit?: string; category?: string }): number => {
  const isWeightBased = isProductWeightBased(product);
  
  // If it's a packet and quantity is fractional (legacy bug), treat as 1 unit for the subtotal calculation
  let effectiveQty = quantity;
  if (!isWeightBased && quantity < 1 && quantity > 0) {
    effectiveQty = Math.round(quantity * 1000); // 0.001 -> 1
  }
  
  if (isWeightBased) {
    return (price * effectiveQty) / 1000;
  }
  
  return price * effectiveQty;
};

/**
 * Calculate and format subtotal for an item, handling legacy fractional packet quantities
 */
export const formatItemSubtotal = (quantity: number, price: number, product?: { sell_type?: string; unit?: string; category?: string }, country?: Country): string => {
  const subtotal = calculateItemSubtotalValue(quantity, price, product);
  return formatCurrency(subtotal, country || COUNTRIES.GERMANY);
};

/**
 * Calculates distance between two coordinates in km using Haversine formula
 */
export const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};
