/**
 * Orders Controller: manages customer order history list, status filtering, and quick reorder.
 */
import { useEffect, useState } from 'react';
import {
  fetchCustomerOrders,
  filterCustomerOrders,
} from '../models/orderModel.js';
import { useApp } from './AppContext.jsx';

export function useOrdersController() {
  const { user, reorder } = useApp();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCustomerOrders()
        .then(setOrders)
        .catch((e) => setError(e.message));
    }
  }, [user]);

  const handleReorder = async (e, orderId) => {
    e.preventDefault();
    e.stopPropagation();
    setReorderingId(orderId);
    try {
      await reorder(orderId);
    } finally {
      setReorderingId(null);
    }
  };

  return {
    orders,
    shown: filterCustomerOrders(orders, filter),
    error,
    filter,
    setFilter,
    reorderingId,
    handleReorder,
  };
}
