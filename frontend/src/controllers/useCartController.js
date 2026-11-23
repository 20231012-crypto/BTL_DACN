/**
 * Cart Controller: handles item quantity updates, removals, and subtotal calculations.
 */
import { useState } from 'react';
import {
  computeCartSubtotal,
  updateCartItemQuantity,
} from '../models/cartModel.js';
import { useApp } from './AppContext.jsx';

export function useCartController() {
  const { cart, refreshCart, notify } = useApp();
  const [busy, setBusy] = useState(null);

  const changeQuantity = async (id, quantity) => {
    setBusy(id);
    try {
      await updateCartItemQuantity(id, quantity);
      await refreshCart();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return {
    cart,
    busy,
    subtotal: computeCartSubtotal(cart),
    changeQuantity,
  };
}
