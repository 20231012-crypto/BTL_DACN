/**
 * Order Detail Controller: handles order status reload, payment actions, prescription edits, requests, and reviews.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  adjustOrderPrescription,
  createVnpayPayment,
  fetchOrderById,
  payOrderDemo,
  replaceOrderPrescription,
  submitOrderRequest,
  submitProductReview,
  switchOrderToCod,
} from '../models/orderModel.js';
import { useApp } from './AppContext.jsx';

const ORDER_STEPS = [
  ['pending', 'Chờ xác nhận'],
  ['confirmed', 'Đã xác nhận'],
  ['packing', 'Đóng gói'],
  ['shipping', 'Đang giao'],
  ['delivered', 'Đã giao'],
];

const STATUS_MAP = {
  ChoXacNhan: 'pending',
  DaXacNhan: 'confirmed',
  DangDongGoi: 'packing',
  DangGiao: 'shipping',
  DaGiao: 'delivered',
};

export function useOrderDetailController(id) {
  const { user, route, notify, config, reorder } = useApp();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState('');
  const [returnEvidence, setReturnEvidence] = useState(null);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rxAdjustment, setRxAdjustment] = useState(null);
  const [justPaid, setJustPaid] = useState(false);

  const paymentReturn = new URLSearchParams(route.split('?')[1]).get('payment');

  const load = useCallback(
    () =>
      fetchOrderById(id)
        .then((value) => {
          setOrder(value);
          setError('');
        })
        .catch((e) => setError(e.message)),
    [id],
  );

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const perform = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const payDemo = (result) =>
    perform(async () => {
      await payOrderDemo(id, result);
      await load();
      notify(
        result === 'success'
          ? 'Thanh toán mô phỏng thành công.'
          : 'Đã mô phỏng giao dịch thất bại.',
        result === 'success' ? 'success' : 'info',
      );
    });

  const replacePrescription = (file) =>
    perform(async () => {
      setOrder(await replaceOrderPrescription(id, file, config?.uploadMode));
      notify('Đã gửi tệp mới để dược sĩ duyệt.');
    });

  const adjustRx = (e) => {
    e.preventDefault();
    perform(async () => {
      setOrder(await adjustOrderPrescription(id, rxAdjustment));
      setRxAdjustment(null);
      notify('Đã điều chỉnh đơn hàng và tính lại tổng tiền.');
    });
  };

  const payVnpay = () =>
    perform(async () => {
      const { url } = await createVnpayPayment(id);
      location.assign(url);
    });

  const switchCod = () =>
    perform(async () => {
      setOrder(await switchOrderToCod(id));
      notify('Đã chuyển sang thanh toán khi nhận hàng.');
    });

  const submitRequest = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await submitOrderRequest({
        orderId: id,
        type: request,
        reason,
        returnEvidence,
        uploadMode: config?.uploadMode,
      });
      setRequest(null);
      setReason('');
      setReturnEvidence(null);
      await load();
      notify(
        result.type === 'cancel' && result.status === 'approved'
          ? 'Đã hủy đơn và giải phóng sản phẩm giữ trong kho.'
          : 'Đã gửi yêu cầu đến nhà thuốc.',
      );
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitProductReview({
        orderId: id,
        productId: review.productId,
        rating,
        comment,
      });
      setReview(null);
      setComment('');
      await load();
      notify('Cảm ơn bạn đã chia sẻ đánh giá.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReorder = () =>
    perform(async () => {
      await reorder(order);
    });

  const abandonBankTransfer = async (
    reasonText = 'Khách đóng cửa sổ thanh toán VietQR',
  ) => {
    if (
      !order ||
      order.status !== 'pending_payment' ||
      order.paymentStatus === 'paid'
    ) {
      return;
    }
    setBusy(true);
    try {
      await submitOrderRequest({
        orderId: order.id,
        type: 'cancel',
        reason: reasonText,
      });
      await reorder(order);
      notify(
        `Đã hủy đơn ${order.code}, sản phẩm đã về giỏ để bạn thêm hoặc đặt lại.`,
        'info',
      );
    } catch (err) {
      notify(err.message || 'Không thể hủy giao dịch chờ thanh toán.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const delivered = ['delivered', 'DaGiao'].includes(order?.status);
  const terminal = [
    'cancelled',
    'returned',
    'DaHuy',
    'rejected',
    'BiTuChoi',
  ].includes(order?.status);
  const pendingRequest = (type) =>
    order?.requests?.some((r) => r.type === type && r.status !== 'rejected');
  const refundAvailable =
    ['cancelled', 'returned'].includes(order?.status) &&
    ['paid', 'refund_pending'].includes(order?.paymentStatus) &&
    !order?.requests?.some(
      (r) =>
        r.status === 'approved' ||
        (r.type === 'refund' && r.status === 'pending'),
    );
  const isOnlineOrder = order && order.paymentMethod !== 'cod';
  const steps = isOnlineOrder
    ? [['pending_payment', 'Thanh toán'], ...ORDER_STEPS]
    : ORDER_STEPS;
  const step = steps.findIndex(
    (s) => s[0] === (STATUS_MAP[order?.status] || order?.status),
  );
  const canReorder = ['delivered', 'DaGiao', 'cancelled', 'DaHuy', 'returned'].includes(
    order?.status,
  );

  return {
    config,
    route,
    notify,
    order,
    error,
    busy,
    paymentReturn,
    steps,
    step,
    delivered,
    terminal,
    canReorder,
    justPaid,
    setJustPaid,
    pendingRequest,
    refundAvailable,
    load,
    payDemo,
    payVnpay,
    switchCod,
    replacePrescription,
    adjustRx,
    rxAdjustment,
    setRxAdjustment,
    request,
    setRequest,
    reason,
    setReason,
    setReturnEvidence,
    submitRequest,
    review,
    setReview,
    rating,
    setRating,
    comment,
    setComment,
    submitReview,
    handleReorder,
    abandonBankTransfer,
  };
}
