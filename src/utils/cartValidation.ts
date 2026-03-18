import { CartItem } from '../types';
import { Product } from '../types';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';
import { getProductStock, isInStock } from './productUtils';

/**
 * Validate if product is in stock for a specific country
 */
export const validateStock = (product: Product, quantity: number, country: Country): {
  isValid: boolean;
  error?: string;
} => {
  const stockKg = getProductStock(product, country);
  const isLoose = product.sell_type === 'loose';
  
  // Stock is in KG in DB. 
  // For Loose: quantity is in grams.
  // For Pack: quantity is in packet count.
  
  let availableQuantity: number;
  let displayStock: string;

  if (isLoose) {
    availableQuantity = stockKg * 1000; // Grams
    displayStock = stockKg >= 1 ? `${stockKg.toFixed(2)}kg` : `${(stockKg * 1000).toFixed(0)}g`;
  } else {
    // Pack items: DB value is already the packet count
    availableQuantity = Math.floor(stockKg);
    displayStock = `${availableQuantity} packets`;
  }

  if (!isInStock(product, country)) {
    return {
      isValid: false,
      error: `${product.name} is out of stock`,
    };
  }

  if (quantity > availableQuantity) {
    return {
      isValid: false,
      error: `Only ${displayStock} available for ${product.name}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate cart item quantity
 */
export const validateQuantity = (
  quantity: number,
  min: number = 1,
  max?: number
): {
  isValid: boolean;
  error?: string;
} => {
  if (quantity < min) {
    return {
      isValid: false,
      error: `Minimum quantity is ${min}`,
    };
  }

  if (max && quantity > max) {
    return {
      isValid: false,
      error: `Maximum quantity is ${max}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate entire cart
 */
export const validateCart = (items: CartItem[]): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Cart is empty');
    return { isValid: false, errors };
  }

  items.forEach((item) => {
    const stock = getProductStock(item.product, item.selectedCountry);
    // Check stock
    const stockValidation = validateStock(item.product, item.quantity, item.selectedCountry);
    if (!stockValidation.isValid && stockValidation.error) {
      errors.push(stockValidation.error);
    }

    // Check quantity
    const isLoose = item.product.sell_type === 'loose';
    const minQuantity = isLoose ? 100 : 1;
    const packSize = item.product.pack_size_grams || 1000;

    // Stock from DB is always in KG. 
    // We need to convert it to the user's unit (grams for loose, packets for pack)
    const maxQuantity = isLoose
      ? stock * 1000
      : Math.floor(stock);

    const quantityValidation = validateQuantity(
      item.quantity,
      minQuantity,
      maxQuantity
    );
    if (!quantityValidation.isValid && quantityValidation.error) {
      errors.push(quantityValidation.error);
    }

    // Check if product is still active
    if (!item.product.active) {
      errors.push(`${item.product.name} is no longer available`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Remove out-of-stock items from cart
 */
export const removeOutOfStockItems = (items: CartItem[]): {
  validItems: CartItem[];
  removedItems: CartItem[];
} => {
  const validItems: CartItem[] = [];
  const removedItems: CartItem[] = [];

  items.forEach((item) => {
    const stock = getProductStock(item.product, item.selectedCountry);
    const isLoose = item.product.sell_type === 'loose';
    const packSize = item.product.pack_size_grams || 1000;
    
    // stock from DB is in KG. Convert to available quantity in units the cart uses
    const maxQuantity = isLoose
      ? stock * 1000
      : Math.floor(stock);


    if (isInStock(item.product, item.selectedCountry) && item.product.active) {
      // Adjust quantity if it exceeds stock
      if (item.quantity > maxQuantity) {
        validItems.push({
          ...item,
          quantity: maxQuantity,
        });
      } else {
        validItems.push(item);
      }
    } else {
      removedItems.push(item);
    }
  });

  return { validItems, removedItems };
};

/**
 * Update cart items based on current product data
 */
export const updateCartWithProductData = (
  cartItems: CartItem[],
  products: Product[]
): CartItem[] => {
  return cartItems
    .map((cartItem) => {
      const updatedProduct = products.find(
        (p) => p.id === cartItem.product.id
      );

      if (!updatedProduct) {
        return null; // Product no longer exists
      }

      if (!updatedProduct.active) {
        return null; // Product is inactive
      }

      // Update product data and adjust quantity if needed
      const isLoose = updatedProduct.sell_type === 'loose';
      const minQuantity = isLoose ? 100 : 1;
      const packSize = updatedProduct.pack_size_grams || 1000;
      const stock = getProductStock(updatedProduct, cartItem.selectedCountry);
      const isAvailable = isInStock(updatedProduct, cartItem.selectedCountry);
      
      const maxQuantity = isLoose
        ? stock * 1000
        : Math.floor(stock);
      
      if (!isAvailable) {
        return null; // Product is out of stock based on new 100g rule
      }

      const quantity = Math.min(
        cartItem.quantity,
        maxQuantity
      );

      return {
        ...cartItem,
        product: updatedProduct,
        quantity: quantity >= minQuantity ? quantity : minQuantity,
      };
    })
    .filter((item): item is CartItem => item !== null);
};

