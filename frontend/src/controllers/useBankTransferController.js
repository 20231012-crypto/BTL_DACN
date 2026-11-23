/**
 * Bank Transfer Controller: loads VietQR payment instructions and auto-polls payment status.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmBankTransferDemo,
  fetchBankTransferDetails,
  fetchOrderPaymentStatus,
} from '../models/orderModel.js';

const POLL_INTERVAL_MS = 4000;

export function useBankTransferController(
  orderId,
  { onPaid, onExpired } = {},
) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const settledRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  const onExpiredRef = useRef(onExpired);
  onPaidRef.current = onPaid;
  onExpiredRef.current = onExpired;

  useEffect(() => {
    settledRef.current = false;
    const controller = new AbortController();
    fetchBankTransferDetails(orderId, controller.signal)
      .then((data) => {
        setDetails(data);
        setError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [orderId]);

  const checkStatus = useCallback(
    async (manual = false) => {
      if (settledRef.current) return;
      if (manual) setChecking(true);
      try {
        const res = await fetchOrderPaymentStatus(orderId);
        if (res?.paymentStatus === 'paid') {
          settledRef.current = true;
          onPaidRef.current?.(res);
        } else if (res?.status && res.status !== 'pending_payment') {
          settledRef.current = true;
          onExpiredRef.current?.(res);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc thăm dò nền.
      } finally {
        if (manual) setChecking(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (!details || error) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden && !settledRef.current) checkStatus(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [details, error, checkStatus]);

  const simulateDemoPaid = useCallback(async () => {
    if (demoBusy || settledRef.current) return;
    setDemoBusy(true);
    try {
      await confirmBankTransferDemo(orderId);
      settledRef.current = true;
      onPaidRef.current?.({ paymentStatus: 'paid', status: 'pending' });
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoBusy(false);
    }
  }, [orderId, demoBusy]);

  const copyText = useCallback(async (key, value) => {
    try {
      await navigator.clipboard?.writeText(String(value || ''));
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      // Clipboard không khả dụng.
    }
  }, []);

  return {
    details,
    error,
    checking,
    demoBusy,
    copied,
    checkNow: () => checkStatus(true),
    simulateDemoPaid,
    copyText,
  };
}
