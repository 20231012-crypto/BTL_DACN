/**
 * Cart Controller: handles product/combo quantity updates, checkbox selection, removals, and selected subtotal calculations.
 */
import { useState } from 'react';
import {
  computeSelectedCartSubtotal,
  getSelectedCartItems,
  setAllCartSelection,
  toggleCartItemSelected,
  updateCartItemQuantity,
} from '../models/cartModel.js';
import { useApp } from './AppContext.jsx';

export function useCartController() {
  const { cart, refreshCart, notify, navigate } = useApp();
  const [busy, setBusy] = useState(null);

  const selectedItems = getSelectedCartItems(cart);
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;
  const selectedCount = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  const changeQuantity = async (item, quantity) => {
    const key = typeof item === 'object' ? item.id : item;
    setBusy(key);
    try {
      await updateCartItemQuantity(item, quantity);
      await refreshCart();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleItem = async (item, nextSelected) => {
    setBusy(item.id);
    try {
      await toggleCartItemSelected(item, nextSelected);
      await refreshCart();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleAll = async (nextSelected) => {
    setBusy('__all__');
    try {
      await setAllCartSelection(nextSelected);
      await refreshCart();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const proceedToCheckout = () => {
    if (!selectedItems.length) {
      notify('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.', 'error');
      return;
    }
    navigate('/checkout');
  };

  return {
    cart,
    selectedItems,
    selectedCount,
    allSelected,
    busy,
    subtotal: computeSelectedCartSubtotal(cart),
    changeQuantity,
    toggleItem,
    toggleAll,
    proceedToCheckout,
  };
}
