/**
 * Checkout Controller: coordinates saved addresses, prescription upload, promotions, and order placement.
 */
import { useEffect, useState } from 'react';
import { fetchAddresses } from '../models/accountModel.js';
import {
  computeCartSubtotal,
  hasPrescriptionItem,
} from '../models/cartModel.js';
import { uploadPrescription } from '../models/httpClient.js';
import {
  createCustomerOrder,
  fetchActivePromotions,
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
  const [prescription, setPrescription] = useState(
    selectedPrescription?.userId === user?.id ? selectedPrescription : null,
  );
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [promos, setPromos] = useState([]);

  const rx = hasPrescriptionItem(cart);
  const subtotal = computeCartSubtotal(cart);
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
    fetchActivePromotions()
      .then(setPromos)
      .catch(() => {});
  }, [user]);

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

  const applyCode = async () => {
    try {
      setError('');
      const result = await validatePromotionCode(promotionCode, subtotal);
      setPromotion(result);
      notify('Đã kiểm tra mã ưu đãi.');
    } catch (err) {
      setPromotion(null);
      setError(err.message);
    }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (rx && !prescription)
      return setError('Vui lòng tải đơn thuốc để dược sĩ kiểm duyệt.');
    setBusy(true);
    try {
      const order = await createCustomerOrder({
        ...(addressId === 'new' ? { address } : { addressId: Number(addressId) }),
        paymentMethod: method,
        ...(prescription ? { prescriptionId: prescription.id } : {}),
        promotionCode: promotion?.code || undefined,
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
      setPromotion(null);
    },
    promotion,
    prescription,
    uploading,
    note,
    setNote,
    error,
    busy,
    promos,
    rx,
    subtotal,
    shippingFee,
    onlineMethods,
    upload,
    applyCode,
    placeOrder,
  };
}
