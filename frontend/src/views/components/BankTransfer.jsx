/**
 * VietQR Bank Transfer Modal View powered by useBankTransferController.
 */
import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  LoaderCircle,
  X,
} from 'lucide-react';
import { money } from '../../models/formatters.js';
import {
  formatCountdown,
  useBankTransferController,
} from '../../controllers/useBankTransferController.js';

export default function BankTransfer({
  orderId,
  orderCode,
  createdAt,
  timeoutMinutes = 30,
  onPaid,
  onExpired,
  onAbandon,
  onClose,
}) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [useFallbackQr, setUseFallbackQr] = useState(false);
  const [qrLoadError, setQrLoadError] = useState(false);

  const handleConfirmAbandon = async () => {
    if (!onAbandon || abandoning) return;
    setAbandoning(true);
    try {
      await onAbandon();
    } finally {
      setAbandoning(false);
    }
  };
  const {
    details,
    error,
    copied,
    stage,
    remainingSec,
    closeInSec,
    copyText,
  } = useBankTransferController(orderId, {
    createdAt,
    timeoutMinutes,
    onPaid,
    onExpired,
    onAutoClose: onClose,
  });

  return (
    <div
      className="qr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Thanh toán chuyển khoản VietQR"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="qr-modal-card">
        <div className="qr-modal-head">
          <div>
            <span className="eyebrow">THANH TOÁN CHUYỂN KHOẢN VIETQR</span>
            <h3>Đơn hàng {orderCode || `#${orderId}`}</h3>
          </div>
          <button
            type="button"
            className="qr-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {stage === 'paid' ? (
          <div className="qr-modal-result is-success">
            <div className="qr-result-icon">
              <CheckCircle2 size={54} />
            </div>
            <h2>Thanh toán thành công!</h2>
            <p>
              Hệ thống đã tự động xác nhận giao dịch chuyển khoản{' '}
              <strong>{details ? money(details.amount) : ''}</strong> cho đơn{' '}
              <strong>{orderCode || `#${orderId}`}</strong>. Đơn hàng đã chuyển
              sang trạng thái <strong>Chờ xác nhận</strong>.
            </p>
            <span className="qr-auto-close">
              Tự động đóng và chuyển về chi tiết đơn sau{' '}
              <strong>{closeInSec} giây</strong>…
            </span>
            <button
              type="button"
              className="btn btn-primary full-width"
              onClick={onClose}
            >
              Xem chi tiết đơn hàng ngay
            </button>
          </div>
        ) : stage === 'expired' ? (
          <div className="qr-modal-result is-expired">
            <div className="qr-result-icon">
              <AlertTriangle size={52} />
            </div>
            <h2>Đã hết thời gian thanh toán</h2>
            <p>
              Đơn hàng <strong>{orderCode || `#${orderId}`}</strong> đã quá thời
              hạn giữ đơn ({timeoutMinutes} phút) và không còn chờ thanh toán.
              Nếu bạn chưa chuyển khoản, đơn sẽ tự động hủy để hoàn lại tồn kho.
            </p>
            <button
              type="button"
              className="btn btn-outline full-width"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        ) : error ? (
          <div className="qr-modal-result">
            <p role="alert">{error}</p>
            <button
              type="button"
              className="btn btn-outline full-width"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        ) : !details ? (
          <div className="qr-modal-result">
            <LoaderCircle className="spin" size={32} />
            <p>Đang tạo mã chuyển khoản VietQR…</p>
          </div>
        ) : (
          <>
            <div className="qr-countdown-bar">
              <Clock3 size={16} />
              <span>Thời gian giữ đơn còn lại:</span>
              <strong>{formatCountdown(remainingSec)}</strong>
            </div>

            <div className="qr-modal-grid">
              <div className="qr-image-box">
                {qrLoadError ? (
                  <p className="small muted" role="alert">
                    Không tải được ảnh QR tự động. Bạn vẫn có thể chuyển khoản
                    thủ công theo đúng số tài khoản, số tiền và nội dung bên
                    cạnh.
                  </p>
                ) : (
                  <img
                    src={
                      useFallbackQr && details.qrFallbackUrl
                        ? details.qrFallbackUrl
                        : details.qrUrl
                    }
                    alt={`Mã VietQR chuyển ${money(details.amount)}`}
                    width="240"
                    height="284"
                    onError={() => {
                      if (!useFallbackQr && details.qrFallbackUrl) {
                        setUseFallbackQr(true);
                      } else {
                        setQrLoadError(true);
                      }
                    }}
                  />
                )}
                <div className="qr-live-pill">
                  <i />
                  <span>Đang tự động kiểm tra giao dịch…</span>
                </div>
              </div>

              <div className="qr-info-box">
                <dl>
                  <dt>Ngân hàng</dt>
                  <dd>{details.bankName}</dd>
                  <dt>Số tài khoản</dt>
                  <dd>
                    <span>{details.account}</span>
                    <button
                      type="button"
                      className="subtle-link"
                      onClick={() => copyText('account', details.account)}
                      title="Sao chép số tài khoản"
                    >
                      {copied === 'account' ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </dd>
                  <dt>Chủ tài khoản</dt>
                  <dd>{details.accountName}</dd>
                  <dt>Số tiền</dt>
                  <dd className="qr-amount">{money(details.amount)}</dd>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd>
                    <strong className="qr-code-content">{details.content}</strong>
                    <button
                      type="button"
                      className="subtle-link"
                      onClick={() => copyText('content', details.content)}
                      title="Sao chép nội dung"
                    >
                      {copied === 'content' ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </dd>
                </dl>
                <p className="small muted">
                  Quét mã và giữ nguyên số tiền + nội dung{' '}
                  <strong>{details.content}</strong>. Ngay khi ngân hàng báo
                  tiền về, cửa sổ này sẽ tự cập nhật{' '}
                  <strong>Thanh toán thành công</strong>.
                </p>
              </div>
            </div>

            {confirmAbandon ? (
              <div className="qr-abandon-confirm" role="alert">
                <p className="small">
                  <strong>Xác nhận hủy đơn {orderCode || `#${orderId}`}?</strong>{' '}
                  Chỉ hủy nếu bạn <strong>chưa chuyển khoản</strong>. Sản phẩm
                  sẽ được trả về giỏ hàng để bạn thêm hàng hoặc đặt lại.
                </p>
                <div className="qr-modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={abandoning}
                    onClick={() => setConfirmAbandon(false)}
                  >
                    Quay lại mã QR
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={abandoning}
                    onClick={handleConfirmAbandon}
                  >
                    {abandoning ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : null}
                    Xác nhận hủy & về giỏ
                  </button>
                </div>
              </div>
            ) : (
              <div className="qr-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline qr-close-bottom"
                  onClick={onClose}
                >
                  Đóng
                </button>
                {onAbandon && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmAbandon(true)}
                  >
                    Hủy đơn & về giỏ hàng
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
