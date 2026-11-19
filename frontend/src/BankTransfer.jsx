import { useEffect, useState } from 'react';
import { api, money } from './lib.js';

export default function BankTransfer({ orderId }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api(`/orders/${orderId}/bank-transfer`, { signal: controller.signal })
      .then(setDetails)
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error.message);
      });
    return () => controller.abort();
  }, [orderId]);
  if (error) return <p role="alert">{error}</p>;
  if (!details) return <p>Đang tạo mã chuyển khoản…</p>;
  return (
    <div className="bank-transfer">
      <h3>Chuyển khoản ngân hàng</h3>
      <img
        src={details.qrUrl}
        alt={`Mã VietQR chuyển ${money(details.amount)}`}
        width="260"
        height="300"
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
