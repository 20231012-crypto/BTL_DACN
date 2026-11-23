/**
 * Cart Model: server cart fetching, mutations, and cart summary computations.
 */
import { api } from './httpClient.js';

export const fetchCart = async () => {
  const result = await api('/cart');
  return Array.isArray(result) ? result : result.items || [];
};

export const addCartItem = (productId, quantity = 1) =>
  api('/cart', { method: 'POST', body: { productId, quantity } });

export const updateCartItemQuantity = (itemId, quantity) =>
  api(`/cart/${itemId}`, {
    method: quantity ? 'PATCH' : 'DELETE',
    ...(quantity ? { body: { quantity } } : {}),
  });

export const computeCartSubtotal = (cart = []) =>
  cart.reduce(
    (sum, item) => sum + Number(item.product?.price || 0) * item.quantity,
    0,
  );

export const computeCartItemCount = (cart = []) =>
  cart.reduce((sum, item) => sum + item.quantity, 0);

export const hasPrescriptionItem = (cart = []) =>
  cart.some((item) => item.product?.prescriptionRequired);
