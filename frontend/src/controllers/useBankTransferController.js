/**
 * Bank Transfer Controller: loads VietQR bank transfer payment instructions for an order.
 */
import { useEffect, useState } from 'react';
import { fetchBankTransferDetails } from '../models/orderModel.js';

export function useBankTransferController(orderId) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchBankTransferDetails(orderId, controller.signal)
      .then(setDetails)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [orderId]);

  return { details, error };
}
