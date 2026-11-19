import { useState } from 'react';
import { api } from './lib.js';

// Trạng thái hàng khách đã gửi trả và biểu mẫu khai báo mã vận đơn của yêu cầu đổi trả đã được duyệt.
const STEPS = {
  awaiting: 'Nhà thuốc đang chờ bạn gửi hàng về',
  in_transit: 'Hàng đang được gửi về nhà thuốc',
  received: 'Nhà thuốc đã nhận hàng và đang kiểm tra',
  restocked: 'Nhà thuốc đã kiểm tra hàng trả về',
  discarded: 'Nhà thuốc đã kiểm tra hàng trả về',
};

export default function ReturnShipment({ orderId, request, notify, onSaved }) {
  const [carrier, setCarrier] = useState(request.returnCarrier || '');
  const [trackingCode, setTrackingCode] = useState(
    request.returnTrackingCode || '',
  );
  const [busy, setBusy] = useState(false);
  const status = request.returnGoodsStatus;
  if (!status) return null;
  const editable = ['awaiting', 'in_transit'].includes(status);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api(
        `/orders/${orderId}/requests/${request.id}/return-shipment`,
        { method: 'POST', body: { carrier, trackingCode } },
      );
      notify('Đã cập nhật thông tin gửi hàng trả về.');
      await onSaved();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="return-shipment">
      <p>
        <strong>Hàng trả về:</strong> {STEPS[status]}
        {request.returnTrackingCode && (
          <>
            {' '}
            · Mã vận đơn <strong>{request.returnTrackingCode}</strong>
            {request.returnCarrier ? ` (${request.returnCarrier})` : ''}
          </>
        )}
      </p>
      {editable && (
        <form onSubmit={submit} className="return-shipment-form">
          <input
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            placeholder="Đơn vị vận chuyển (GHN, Viettel Post…)"
            aria-label="Đơn vị vận chuyển"
            maxLength={60}
          />
          <input
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            placeholder="Mã vận đơn"
            aria-label="Mã vận đơn"
            minLength={3}
            maxLength={60}
            required
          />
          <button className="btn btn-outline" disabled={busy}>
            {status === 'in_transit' ? 'Cập nhật mã vận đơn' : 'Đã gửi hàng'}
          </button>
        </form>
      )}
    </div>
  );
}
