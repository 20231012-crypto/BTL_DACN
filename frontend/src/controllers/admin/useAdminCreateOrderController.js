/**
 * Admin Create Order Controller: handles assisted in-store order lookup, item picker, promo checks, and creation.
 */
import { useEffect, useState } from 'react';
import { money, searchScore } from '../../models/formatters.js';
import { validatePromotionCode } from '../../models/orderModel.js';
import {
  createAdminAssistedOrder,
  fetchAdminOrderLookup,
} from '../../models/adminModel.js';

export function useAdminCreateOrderController({ onCreated, notify }) {
  const [lookup, setLookup] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [address, setAddress] = useState({
    recipient: '',
    phone: '',
    line1: '',
    ward: '',
    district: '',
    city: '',
  });
  const [productQuery, setProductQuery] = useState('');
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [promoCode, setPromoCode] = useState('');
  const [promoPreview, setPromoPreview] = useState(null);
  const [note, setNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);

  useEffect(() => {
    fetchAdminOrderLookup()
      .then((res) => {
        setLookup(res);
        const firstCustomer = res.customers?.[0];
        if (firstCustomer) {
          setUserId(String(firstCustomer.id));
          const defAddr = firstCustomer.addresses?.[0];
          if (defAddr) {
            setAddressId(String(defAddr.id));
            setAddress({
              recipient: defAddr.recipient || '',
              phone: defAddr.phone || '',
              line1: defAddr.line1 || '',
              ward: defAddr.ward || '',
              district: defAddr.district || '',
              city: defAddr.city || '',
            });
          } else {
            setAddress((a) => ({
              ...a,
              recipient: firstCustomer.name || '',
              phone: firstCustomer.phone || '',
            }));
          }
        }
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoadingLookup(false));
  }, []);

  const selectedCustomer = lookup?.customers?.find(
    (c) => String(c.id) === userId,
  );

  const selectCustomer = (nextId) => {
    setUserId(nextId);
    const cust = lookup?.customers?.find((c) => String(c.id) === nextId);
    const defAddr = cust?.addresses?.[0];
    if (defAddr) {
      setAddressId(String(defAddr.id));
      setAddress({
        recipient: defAddr.recipient || '',
        phone: defAddr.phone || '',
        line1: defAddr.line1 || '',
        ward: defAddr.ward || '',
        district: defAddr.district || '',
        city: defAddr.city || '',
      });
    } else {
      setAddressId('');
      setAddress({
        recipient: cust?.name || '',
        phone: cust?.phone || '',
        line1: '',
        ward: '',
        district: '',
        city: '',
      });
    }
  };

  const selectSavedAddress = (nextAddrId) => {
    setAddressId(nextAddrId);
    const found = selectedCustomer?.addresses?.find(
      (a) => String(a.id) === nextAddrId,
    );
    if (found) {
      setAddress({
        recipient: found.recipient || '',
        phone: found.phone || '',
        line1: found.line1 || '',
        ward: found.ward || '',
        district: found.district || '',
        city: found.city || '',
      });
    }
  };

  const filteredProducts = (lookup?.products || [])
    .filter(
      (p) =>
        !productQuery || searchScore(`${p.name} ${p.ingredient}`, productQuery) > 0,
    )
    .slice(0, 8);

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((x) =>
          x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
    setPromoPreview(null);
  };

  const updateItemQuantity = (productId, stock, rawVal) => {
    const val = Math.max(1, Math.min(stock, Number(rawVal) || 1));
    setItems((prev) =>
      prev.map((x) =>
        x.productId === productId ? { ...x, quantity: val } : x,
      ),
    );
    setPromoPreview(null);
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((x) => x.productId !== productId));
    setPromoPreview(null);
  };

  const subtotal = items.reduce(
    (sum, x) => sum + x.product.price * x.quantity,
    0,
  );
  const freeThreshold = Number(
    lookup?.settings?.freeShippingThreshold || 299000,
  );
  const shippingFee =
    items.length === 0
      ? 0
      : subtotal >= freeThreshold
        ? 0
        : Number(lookup?.settings?.shippingFee || 25000);
  const discount = promoPreview?.discount || 0;
  const total = Math.max(0, subtotal + shippingFee - discount);

  const checkPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await validatePromotionCode(promoCode.trim(), subtotal);
      setPromoPreview(res);
      notify(`Áp dụng mã ${res.code}: giảm ${money(res.discount)}.`);
    } catch (err) {
      setPromoPreview(null);
      notify(err.message, 'error');
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!items.length) {
      notify('Vui lòng thêm ít nhất 1 sản phẩm vào đơn.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAdminAssistedOrder({
        userId: Number(userId),
        ...(addressId ? { addressId: Number(addressId) } : { address }),
        items: items.map((x) => ({
          productId: x.productId,
          quantity: x.quantity,
        })),
        paymentMethod,
        promotionCode: promoCode.trim() || undefined,
        note,
        internalNote,
        autoConfirm: paymentMethod === 'cod' && autoConfirm,
      });
      notify(`Đã tạo đơn hàng ${created.code} thành công.`);
      await onCreated(created);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    lookup,
    loadingLookup,
    submitting,
    userId,
    addressId,
    address,
    setAddress,
    productQuery,
    setProductQuery,
    items,
    paymentMethod,
    setPaymentMethod,
    promoCode,
    setPromoCode: (val) => {
      setPromoCode(val);
      setPromoPreview(null);
    },
    note,
    setNote,
    internalNote,
    setInternalNote,
    autoConfirm,
    setAutoConfirm,
    selectedCustomer,
    filteredProducts,
    subtotal,
    shippingFee,
    discount,
    total,
    selectCustomer,
    selectSavedAddress,
    addItem,
    updateItemQuantity,
    removeItem,
    checkPromo,
    submitOrder,
  };
}
