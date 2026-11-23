/**
 * Return Shipment Controller: manages customer return tracking code submission.
 */
import { useState } from 'react';
import { submitReturnShipment } from '../models/orderModel.js';

export function useReturnShipmentController({
  orderId,
  request,
  notify,
  onSaved,
}) {
  const [carrier, setCarrier] = useState(request.returnCarrier || '');
  const [trackingCode, setTrackingCode] = useState(
    request.returnTrackingCode || '',
  );
  const [busy, setBusy] = useState(false);

  const status = request.returnGoodsStatus;
  const editable = ['awaiting', 'in_transit'].includes(status);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await submitReturnShipment(orderId, request.id, {
        carrier,
        trackingCode,
      });
      notify('Đã cập nhật thông tin gửi hàng trả về.');
      await onSaved();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return {
    carrier,
    setCarrier,
    trackingCode,
    setTrackingCode,
    busy,
    status,
    editable,
    submit,
  };
}
