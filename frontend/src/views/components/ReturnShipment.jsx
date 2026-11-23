/**
 * Return Shipment Form View powered by useReturnShipmentController.
 */
import React from 'react';
import { RETURN_SHIPMENT_STEPS } from '../../models/constants.js';
import { useReturnShipmentController } from '../../controllers/useReturnShipmentController.js';

export default function ReturnShipment({ orderId, request, notify, onSaved }) {
  const c = useReturnShipmentController({ orderId, request, notify, onSaved });
  if (!c.status) return null;

  return (
    <div className="return-shipment">
      <p>
        <strong>Hàng trả về:</strong> {RETURN_SHIPMENT_STEPS[c.status]}
        {request.returnTrackingCode && (
          <>
            {' '}
            · Mã vận đơn <strong>{request.returnTrackingCode}</strong>
            {request.returnCarrier ? ` (${request.returnCarrier})` : ''}
          </>
        )}
      </p>
      {c.editable && (
        <form onSubmit={c.submit} className="return-shipment-form">
          <input
            value={c.carrier}
            onChange={(event) => c.setCarrier(event.target.value)}
            placeholder="Đơn vị vận chuyển (GHN, Viettel Post…)"
            aria-label="Đơn vị vận chuyển"
            maxLength={60}
          />
          <input
            value={c.trackingCode}
            onChange={(event) => c.setTrackingCode(event.target.value)}
            placeholder="Mã vận đơn"
            aria-label="Mã vận đơn"
            minLength={3}
            maxLength={60}
            required
          />
          <button className="btn btn-outline" disabled={c.busy}>
            {c.status === 'in_transit' ? 'Cập nhật mã vận đơn' : 'Đã gửi hàng'}
          </button>
        </form>
      )}
    </div>
  );
}
