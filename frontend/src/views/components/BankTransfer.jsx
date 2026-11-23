/**
 * VietQR Bank Transfer View powered by useBankTransferController.
 */
import React from 'react';
import { money } from '../../models/formatters.js';
import { useBankTransferController } from '../../controllers/useBankTransferController.js';

export default function BankTransfer({ orderId }) {
  const { details, error } = useBankTransferController(orderId);

  if (error) return <p role="alert">{error}</p>;
  if (!details) return <p>Đang tạo mã chuyển khoản…</p>;

  return (
    <div className="bank-transfer">
      <h3>Chuyển khoản ngân hàng</h3>
      <img
        src={details.qrUrl}
        alt={`Mã VietQR chuyển ${money(details.amount)}`}
        width="260"
        height="308"
      />
      <dl>
        <dt>Ngân hàng</dt>
        <dd>{details.bankName}</dd>
        <dt>Số tài khoản</dt>
        <dd>{details.account}</dd>
        <dt>Chủ tài khoản</dt>
        <dd>{details.accountName}</dd>
        <dt>Số tiền</dt>
        <dd>{money(details.amount)}</dd>
        <dt>Nội dung</dt>
        <dd>{details.content}</dd>
      </dl>
      <p className="small muted">
        Chuyển đúng số tiền và nội dung trên mã. Nhân viên xác nhận khi đối soát
        sao kê. Đơn chưa thanh toán hết hạn theo thời gian giữ đơn.
      </p>
    </div>
  );
}
