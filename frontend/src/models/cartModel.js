/**
 * Cart Model: server cart fetching, product & combo mutations, checkbox selection, and summary computations.
 */
import { api } from './httpClient.js';

export const fetchCart = async () => {
  const result = await api('/cart');
  return Array.isArray(result) ? result : result.items || [];
};

export const addCartItem = (productId, quantity = 1) =>
  api('/cart', { method: 'POST', body: { productId, quantity } });

export const addComboToCart = (comboId, quantity = 1) =>
  api('/cart/combos', { method: 'POST', body: { comboId, quantity } });

export const updateCartItemQuantity = (item, quantity) => {
  if (typeof item === 'object' && item?.itemType === 'combo') {
    return api(`/cart/combos/${item.comboCartId}`, {
      method: quantity ? 'PATCH' : 'DELETE',
      ...(quantity ? { body: { quantity } } : {}),
    });
  }
  const itemId = typeof item === 'object' ? item.id : item;
  return api(`/cart/${itemId}`, {
    method: quantity ? 'PATCH' : 'DELETE',
    ...(quantity ? { body: { quantity } } : {}),
  });
};

export const toggleCartItemSelected = (item, selected) => {
  if (item?.itemType === 'combo') {
    return api(`/cart/combos/${item.comboCartId}`, {
      method: 'PATCH',
      body: { selected: !!selected },
    });
  }
  return api(`/cart/${item.id}`, {
    method: 'PATCH',
    body: { selected: !!selected },
  });
};

export const setAllCartSelection = (selected) =>
  api('/cart/selection', {
    method: 'PATCH',
    body: { selected: !!selected },
  });

export const getCartItemUnitPrice = (item) =>
  item?.itemType === 'combo'
    ? Number(item.combo?.price || 0)
    : Number(item.product?.price || 0);

export const getSelectedCartItems = (cart = []) =>
  cart.filter((item) => item.selected !== false);

export const computeCartSubtotal = (cart = []) =>
  cart.reduce(
    (sum, item) => sum + getCartItemUnitPrice(item) * Number(item.quantity || 0),
    0,
  );

export const computeSelectedCartSubtotal = (cart = []) =>
  computeCartSubtotal(getSelectedCartItems(cart));

export const computeCartItemCount = (cart = []) =>
  cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

export const hasPrescriptionItem = (cart = []) =>
  cart.some((item) =>
    item?.itemType === 'combo'
      ? !!item.combo?.prescriptionRequired
      : !!item.product?.prescriptionRequired,
  );

export const extractCartSelectionPayload = (items = []) => ({
  cartItemIds: items
    .filter((i) => i.itemType !== 'combo')
    .map((i) => i.id),
  comboCartItemIds: items
    .filter((i) => i.itemType === 'combo')
    .map((i) => i.comboCartId),
});
