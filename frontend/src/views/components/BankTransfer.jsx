/**
 * VietQR Bank Transfer View powered by useBankTransferController.
 */
import React from 'react';
import { Check, Copy, LoaderCircle, RefreshCw } from 'lucide-react';
import { money } from '../../models/formatters.js';
import { useBankTransferController } from '../../controllers/useBankTransferController.js';

export default function BankTransfer({
  orderId,
  demoMode = false,
  onPaid,
  onExpired,
}) {
  const {
    details,
    error,
    checking,
    demoBusy,
    copied,
    checkNow,
    simulateDemoPaid,
    copyText,
  } = useBankTransferController(orderId, { onPaid, onExpired });

  if (error) return <p role="alert">{error}</p>;
  if (!details) return <p>Đang tạo mã chuyển khoản…</p>;

  return (
    <div className="bank-transfer">
      <h3>Chuyển khoản ngân hàng (VietQR)</h3>
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
        <dd>
          {details.account}{' '}
          <button
            type="button"
            className="subtle-link"
            onClick={() => copyText('account', details.account)}
            title="Sao chép số tài khoản"
          >
            {copied === 'account' ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </dd>
        <dt>Chủ tài khoản</dt>
        <dd>{details.accountName}</dd>
        <dt>Số tiền</dt>
        <dd>{money(details.amount)}</dd>
        <dt>Nội dung</dt>
        <dd>
          <strong>{details.content}</strong>{' '}
          <button
            type="button"
            className="subtle-link"
            onClick={() => copyText('content', details.content)}
            title="Sao chép nội dung chuyển khoản"
          >
            {copied === 'content' ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </dd>
      </dl>
      <p className="small muted">
        {details.autoVerify
          ? 'Hệ thống đang tự động kiểm tra giao dịch mỗi vài giây. Chuyển đúng số tiền và nội dung trên mã, đơn hàng sẽ tự động cập nhật Đã thanh toán.'
          : 'Chuyển đúng số tiền và nội dung trên mã. Hệ thống tự động cập nhật ngay khi giao dịch được xác nhận.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-outline full-width"
          disabled={checking}
          onClick={checkNow}
        >
          {checking ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          Kiểm tra trạng thái thanh toán
        </button>
        {demoMode && (
          <button
            type="button"
            className="btn btn-primary full-width"
            disabled={demoBusy}
            onClick={simulateDemoPaid}
          >
            {demoBusy ? <LoaderCircle className="spin" size={16} /> : null}
            Mô phỏng ngân hàng báo tiền về (Demo)
          </button>
        )}
      </div>
    </div>
  );
}
