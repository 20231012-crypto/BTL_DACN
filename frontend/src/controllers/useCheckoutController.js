/**
 * Checkout Controller: coordinates selected cart items (products & combos), saved addresses,
 * prescription upload, voucher picker (manual selection or best auto-selection), and order placement.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAddresses } from '../models/accountModel.js';
import {
  computeCartSubtotal,
  extractCartSelectionPayload,
  getSelectedCartItems,
  hasPrescriptionItem,
} from '../models/cartModel.js';
import { uploadPrescription } from '../models/httpClient.js';
import {
  createCustomerOrder,
  evaluatePromotionsForSelection,
  validatePromotionCode,
} from '../models/orderModel.js';
import { useApp } from './AppContext.jsx';

export function useCheckoutController() {
  const {
    user,
    cart,
    refreshCart,
    navigate,
    notify,
    config,
    selectedPrescription,
    setSelectedPrescription,
  } = useApp();

  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState('new');
  const [address, setAddress] = useState({
    recipient: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    ward: '',
    district: '',
    city: '',
  });
  const [method, setMethod] = useState('cod');
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [evaluatedPromos, setEvaluatedPromos] = useState([]);
  const [bestPromotion, setBestPromotion] = useState(null);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [prescription, setPrescription] = useState(
    selectedPrescription?.userId === user?.id ? selectedPrescription : null,
  );
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkoutItems = useMemo(() => getSelectedCartItems(cart), [cart]);
  const selectionPayload = useMemo(
    () => extractCartSelectionPayload(checkoutItems),
    [checkoutItems],
  );
  const selectionSignature = useMemo(
    () =>
      checkoutItems
        .map((i) => `${i.id}:${i.quantity}`)
        .join('|'),
    [checkoutItems],
  );

  const rx = hasPrescriptionItem(checkoutItems);
  const subtotal = computeCartSubtotal(checkoutItems);
  const shippingFee = config
    ? subtotal >= config.freeShippingThreshold
      ? 0
      : config.shippingFee
    : null;
  const onlineMethods = (config?.paymentMethods || []).filter(
    (value) => value !== 'cod',
  );

  useEffect(() => {
    if (!user) return;
    setAddress((current) => ({
      ...current,
      recipient: current.recipient || user.name || '',
      phone: current.phone || user.phone || '',
    }));
    fetchAddresses()
      .then((arr) => {
        setAddresses(arr);
        const def = arr.find((a) => a.isDefault);
        if (def) setAddressId(String(def.id));
      })
      .catch(() => {});
  }, [user]);

  const refreshPromotions = useCallback(async () => {
    if (!user || !checkoutItems.length) {
      setEvaluatedPromos([]);
      setBestPromotion(null);
      setPromotion(null);
      return;
    }
    setLoadingPromos(true);
    try {
      const res = await evaluatePromotionsForSelection(selectionPayload);
      const list = Array.isArray(res?.promotions) ? res.promotions : [];
      setEvaluatedPromos(list);
      setBestPromotion(res?.bestPromotion || null);
      setPromotion((current) => {
        if (!current) return null;
        const updated = list.find(
          (p) => p.code === current.code && p.eligible,
        );
        return updated || null;
      });
    } catch {
      setEvaluatedPromos([]);
      setBestPromotion(null);
    } finally {
      setLoadingPromos(false);
    }
  }, [user, checkoutItems.length, selectionPayload]);

  useEffect(() => {
    refreshPromotions();
  }, [selectionSignature, refreshPromotions]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadPrescription(file, config?.uploadMode);
      setPrescription({ ...result, fileName: file.name });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const applyCode = async (overrideCode) => {
    const codeToApply = String(overrideCode ?? promotionCode)
      .trim()
      .toUpperCase();
    if (!codeToApply) return;
    try {
      setError('');
      const result = await validatePromotionCode(
        codeToApply,
        subtotal,
        selectionPayload,
      );
      setPromotionCode(result.code);
      setPromotion(result);
      setVoucherModalOpen(false);
      notify(`Đã áp dụng voucher ${result.code} (giảm ${result.discount.toLocaleString('vi-VN')}đ).`);
    } catch (err) {
      setPromotion(null);
      setError(err.message);
    }
  };

  const selectPromotion = (promo) => {
    if (!promo?.eligible) return;
    setError('');
    setPromotionCode(promo.code);
    setPromotion(promo);
    setVoucherModalOpen(false);
    notify(
      `Đã chọn voucher ${promo.code} — giảm ${promo.discount.toLocaleString('vi-VN')}đ.`,
    );
  };

  const applyBestPromotion = () => {
    if (!bestPromotion) {
      notify('Hiện chưa có voucher phù hợp cho các sản phẩm đã chọn.', 'info');
      return;
    }
    selectPromotion(bestPromotion);
  };

  const clearPromotion = () => {
    setPromotion(null);
    setPromotionCode('');
    setError('');
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (!checkoutItems.length)
      return setError('Vui lòng chọn ít nhất 1 sản phẩm trong giỏ hàng.');
    if (rx && !prescription)
      return setError('Vui lòng tải đơn thuốc để dược sĩ kiểm duyệt.');
    setBusy(true);
    try {
      const order = await createCustomerOrder({
        ...(addressId === 'new' ? { address } : { addressId: Number(addressId) }),
        paymentMethod: method,
        ...(prescription ? { prescriptionId: prescription.id } : {}),
        promotionCode: promotion?.code || undefined,
        ...selectionPayload,
        note,
      });
      await refreshCart();
      setSelectedPrescription(null);
      navigate(`/orders/${order.id}?created=1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return {
    cart,
    checkoutItems,
    addresses,
    addressId,
    setAddressId,
    address,
    setAddress,
    method,
    setMethod,
    promotionCode,
    setPromotionCode: (val) => {
      setPromotionCode(val);
      if (promotion && promotion.code !== val.trim().toUpperCase()) {
        setPromotion(null);
      }
    },
    promotion,
    promos: evaluatedPromos,
    bestPromotion,
    loadingPromos,
    voucherModalOpen,
    setVoucherModalOpen,
    selectPromotion,
    applyBestPromotion,
    clearPromotion,
    prescription,
    uploading,
    note,
    setNote,
    error,
    busy,
    rx,
    subtotal,
    shippingFee,
    onlineMethods,
    upload,
    applyCode,
    placeOrder,
  };
}
