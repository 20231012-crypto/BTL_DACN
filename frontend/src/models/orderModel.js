/**
 * Order Model: checkout, order tracking, payments, prescription adjustments, return requests, and reviews.
 */
import { api, uploadPrescription, uploadToStorage } from './httpClient.js';

export const fetchCustomerOrders = async () => {
  const data = await api('/orders');
  return Array.isArray(data) ? data : data.items || [];
};

export const fetchOrderById = (id) => api(`/orders/${id}`);

export const createCustomerOrder = (payload) =>
  api('/orders', { method: 'POST', body: payload });

export const payOrderDemo = (orderId, result) =>
  api(`/orders/${orderId}/payment`, {
    method: 'POST',
    body: { result },
  });

export const createVnpayPayment = (orderId) =>
  api(`/orders/${orderId}/vnpay`, { method: 'POST' });

export const switchOrderToCod = (orderId) =>
  api(`/orders/${orderId}/payment-method`, {
    method: 'POST',
    body: { paymentMethod: 'cod' },
  });

export const fetchBankTransferDetails = (orderId, signal) =>
  api(`/orders/${orderId}/bank-transfer`, { signal });

export const replaceOrderPrescription = async (orderId, file, uploadMode) => {
  const attachment = await uploadPrescription(file, uploadMode);
  return api(`/orders/${orderId}/prescription`, {
    method: 'POST',
    body: { prescriptionId: attachment.id },
  });
};

export const adjustOrderPrescription = (orderId, mode) =>
  api(`/orders/${orderId}/rx-adjustment`, {
    method: 'POST',
    body: { mode },
  });

export const submitOrderRequest = async ({
  orderId,
  type,
  reason,
  returnEvidence,
  uploadMode,
}) => {
  let payload = { type, reason };
  if (type === 'return') {
    if (
      !returnEvidence ||
      returnEvidence.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png'].includes(returnEvidence.type)
    ) {
      throw new Error('Chọn ảnh JPG hoặc PNG của sản phẩm, tối đa 5 MB.');
    }
    if (uploadMode === 'signed') {
      payload.uploadId = await uploadToStorage(returnEvidence, 'return');
    } else {
      payload = new FormData();
      payload.append('type', type);
      payload.append('reason', reason);
      payload.append('evidence', returnEvidence);
    }
  }
  return api(`/orders/${orderId}/requests`, {
    method: 'POST',
    body: payload,
  });
};

export const submitReturnShipment = (orderId, requestId, payload) =>
  api(`/orders/${orderId}/requests/${requestId}/return-shipment`, {
    method: 'POST',
    body: payload,
  });

export const submitProductReview = ({ orderId, productId, rating, comment }) =>
  api('/reviews', {
    method: 'POST',
    body: {
      orderId: Number(orderId),
      productId,
      rating,
      comment,
    },
  });

export const fetchActivePromotions = async () => {
  const data = await api('/promotions');
  return Array.isArray(data) ? data : [];
};

export const validatePromotionCode = (code, subtotal) =>
  api('/promotions/validate', {
    method: 'POST',
    body: { code, subtotal },
  });

export const filterCustomerOrders = (orders, filter) =>
  orders?.filter(
    (o) =>
      filter === 'all' ||
      (filter === 'done'
        ? ['delivered', 'DaGiao'].includes(o.status)
        : ![
            'delivered',
            'DaGiao',
            'cancelled',
            'DaHuy',
            'rejected',
            'BiTuChoi',
          ].includes(o.status)),
  );
