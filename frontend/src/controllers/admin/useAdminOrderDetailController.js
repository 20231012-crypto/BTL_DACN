/**
 * Admin Order Detail Controller: manages inline address edits, fulfillment updates, and staff-recorded requests.
 */
import { useEffect, useState } from 'react';
import { list, safeJson } from '../../models/formatters.js';
import {
  createAdminOrderRequest,
  expireSingleOrder,
  isOrderOverdue,
  stepperIndex,
  updateOrderFulfillment,
} from '../../models/adminModel.js';

export function useAdminOrderDetailController({
  item,
  setSaving,
  onOrderUpdated,
  notify,
}) {
  const [detailTab, setDetailTab] = useState('history');
  const [editingAddress, setEditingAddress] = useState(false);
  const [recordingRequest, setRecordingRequest] = useState(null);
  const [fulfillDraft, setFulfillDraft] = useState({
    shippingCarrier: item.shippingCarrier || '',
    trackingCode: item.trackingCode || '',
    internalNote: item.internalNote || '',
  });
  const addr = safeJson(item.address, {});
  const [addrDraft, setAddrDraft] = useState({
    recipient: addr.recipient || '',
    phone: addr.phone || '',
    line1: addr.line1 || '',
    ward: addr.ward || '',
    district: addr.district || '',
    city: addr.city || '',
  });
  const [reqDraft, setReqDraft] = useState({
    reason: '',
    reply: '',
    sealed: false,
    storeFault: false,
    restock: false,
  });

  useEffect(() => {
    const a = safeJson(item.address, {});
    setFulfillDraft({
      shippingCarrier: item.shippingCarrier || '',
      trackingCode: item.trackingCode || '',
      internalNote: item.internalNote || '',
    });
    setAddrDraft({
      recipient: a.recipient || '',
      phone: a.phone || '',
      line1: a.line1 || '',
      ward: a.ward || '',
      district: a.district || '',
      city: a.city || '',
    });
    setEditingAddress(false);
    setRecordingRequest(null);
  }, [item.id, item.updatedAt, item.status]);

  const items = safeJson(item.items, []);
  const allocations = list(item.allocations);
  const history = list(item.history);
  const transactions = list(item.transactions);
  const requests = list(item.requests);

  const canEditAddress = [
    'pending_prescription',
    'pending_payment',
    'pending',
    'confirmed',
  ].includes(item.status);

  const canRecordCancel =
    [
      'pending_prescription',
      'pending_payment',
      'pending',
      'confirmed',
      'packing',
      'delivery_failed',
    ].includes(item.status) &&
    !requests.some(
      (r) =>
        r.status === 'pending' ||
        (r.status === 'approved' && r.type === 'cancel'),
    );

  const canRecordReturn =
    item.status === 'delivered' &&
    !requests.some(
      (r) =>
        r.status === 'pending' ||
        (r.status === 'approved' && r.type === 'return'),
    );

  const overdue = isOrderOverdue(item);
  const stepPos = stepperIndex(item.status);
  const isTerminalCancel = item.status === 'cancelled';

  const allocsByProduct = new Map();
  for (const a of allocations) {
    const arr = allocsByProduct.get(a.productId) || [];
    arr.push(a);
    allocsByProduct.set(a.productId, arr);
  }

  const actionableReq = requests.find(
    (r) =>
      r.status === 'pending' ||
      (!(
        r.type === 'return' &&
        ['awaiting', 'in_transit'].includes(r.returnGoodsStatus)
      ) &&
        r.status === 'approved' &&
        ['paid', 'refund_pending'].includes(item.paymentStatus) &&
        ['cancelled', 'returned'].includes(item.status) &&
        !r.refundAmount),
  );

  const waitingReturnReq = requests.find(
    (r) =>
      r.status === 'approved' &&
      r.type === 'return' &&
      ['awaiting', 'in_transit'].includes(r.returnGoodsStatus),
  );

  const saveFulfillment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateOrderFulfillment(item.id, fulfillDraft);
      notify('Đã cập nhật thông tin vận chuyển & ghi chú nội bộ.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateOrderFulfillment(item.id, {
        address: addrDraft,
      });
      setEditingAddress(false);
      notify('Đã cập nhật địa chỉ giao hàng.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const expireNow = async () => {
    setSaving(true);
    try {
      const updated = await expireSingleOrder(item.id);
      notify('Đã hủy đơn quá hạn thanh toán và hoàn tồn giữ chỗ.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitAdminRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await createAdminOrderRequest(item.id, {
        type: recordingRequest,
        ...reqDraft,
      });
      setRecordingRequest(null);
      setReqDraft({
        reason: '',
        reply: '',
        sealed: false,
        storeFault: false,
        restock: false,
      });
      notify(
        recordingRequest === 'cancel'
          ? 'Đã ghi nhận hủy đơn hàng.'
          : 'Đã ghi nhận đổi trả đơn hàng.',
      );
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    addr,
    items,
    history,
    transactions,
    requests,
    allocsByProduct,
    detailTab,
    setDetailTab,
    editingAddress,
    setEditingAddress,
    recordingRequest,
    setRecordingRequest,
    fulfillDraft,
    setFulfillDraft,
    addrDraft,
    setAddrDraft,
    reqDraft,
    setReqDraft,
    canEditAddress,
    canRecordCancel,
    canRecordReturn,
    overdue,
    stepPos,
    isTerminalCancel,
    actionableReq,
    waitingReturnReq,
    saveFulfillment,
    saveAddress,
    expireNow,
    submitAdminRequest,
  };
}
