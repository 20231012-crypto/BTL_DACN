/**
 * Bank Transfer Controller: loads VietQR payment instructions, auto-polls status, and manages countdown.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmBankTransferDemo,
  fetchBankTransferDetails,
  fetchOrderPaymentStatus,
} from '../models/orderModel.js';

const POLL_INTERVAL_MS = 4000;
const DEFAULT_TIMEOUT_MINUTES = 30;

function computeRemainingSeconds(createdAt, timeoutMinutes) {
  if (!createdAt) return timeoutMinutes * 60;
  const expiresAt = Date.parse(createdAt) + timeoutMinutes * 60 * 1000;
  if (Number.isNaN(expiresAt)) return timeoutMinutes * 60;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function useBankTransferController(
  orderId,
  {
    createdAt,
    timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
    onPaid,
    onExpired,
    onAutoClose,
  } = {},
) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [stage, setStage] = useState('waiting'); // 'waiting' | 'paid' | 'expired'
  const [remainingSec, setRemainingSec] = useState(() =>
    computeRemainingSeconds(createdAt, timeoutMinutes),
  );
  const [closeInSec, setCloseInSec] = useState(5);

  const settledRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  const onExpiredRef = useRef(onExpired);
  const onAutoCloseRef = useRef(onAutoClose);
  onPaidRef.current = onPaid;
  onExpiredRef.current = onExpired;
  onAutoCloseRef.current = onAutoClose;

  useEffect(() => {
    settledRef.current = false;
    setStage('waiting');
    setCloseInSec(5);
    setRemainingSec(computeRemainingSeconds(createdAt, timeoutMinutes));
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
  }, [orderId, createdAt, timeoutMinutes]);

  const markPaid = useCallback((res) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStage('paid');
    onPaidRef.current?.(res);
  }, []);

  const markExpired = useCallback((res) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStage('expired');
    onExpiredRef.current?.(res);
  }, []);

  const checkStatus = useCallback(
    async (manual = false) => {
      if (settledRef.current) return;
      if (manual) setChecking(true);
      try {
        const res = await fetchOrderPaymentStatus(orderId);
        if (res?.paymentStatus === 'paid') {
          markPaid(res);
        } else if (res?.status && res.status !== 'pending_payment') {
          markExpired(res);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc thăm dò nền.
      } finally {
        if (manual) setChecking(false);
      }
    },
    [orderId, markPaid, markExpired],
  );

  // Thăm dò trạng thái thanh toán mỗi 4 giây
  useEffect(() => {
    if (!details || error || stage !== 'waiting') return undefined;
    const timer = setInterval(() => {
      if (!document.hidden && !settledRef.current) checkStatus(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [details, error, stage, checkStatus]);

  // Đếm ngược thời gian giữ đơn
  useEffect(() => {
    if (stage !== 'waiting') return undefined;
    const timer = setInterval(() => {
      const next = computeRemainingSeconds(createdAt, timeoutMinutes);
      setRemainingSec(next);
      if (next <= 0) {
        markExpired({ status: 'cancelled', reason: 'timeout' });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, createdAt, timeoutMinutes, markExpired]);

  // Đếm ngược 5 giây tự đóng sau khi thanh toán thành công
  useEffect(() => {
    if (stage !== 'paid') return undefined;
    const timer = setInterval(() => {
      setCloseInSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAutoCloseRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const simulateDemoPaid = useCallback(async () => {
    if (demoBusy || settledRef.current) return;
    setDemoBusy(true);
    try {
      await confirmBankTransferDemo(orderId);
      markPaid({ paymentStatus: 'paid', status: 'pending' });
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoBusy(false);
    }
  }, [orderId, demoBusy, markPaid]);

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
    stage,
    remainingSec,
    closeInSec,
    checkNow: () => checkStatus(true),
    simulateDemoPaid,
    copyText,
  };
}
