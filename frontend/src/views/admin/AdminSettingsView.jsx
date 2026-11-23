/**
 * Admin System Settings & Backup View.
 */
import React, { useMemo } from 'react';
import {
  Boxes,
  Check,
  Download,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { EDITABLE_SETTINGS_KEYS } from '../../models/constants.js';
import { Badge, CheckField, Field } from './adminUi.jsx';

export default function AdminSettingsView({
  data,
  form,
  saving,
  isAdmin,
  hasPermission,
  onChange,
  onReset,
  onSubmit,
  onOpenBackup,
  onOpenRestore,
}) {
  const dirty = useMemo(
    () =>
      Boolean(form.geminiApiKey?.trim()) ||
      EDITABLE_SETTINGS_KEYS.some((key) => {
        if (key === 'chatbotEnabled') return !!form[key] !== !!data?.[key];
        return String(form[key] ?? '') !== String(data?.[key] ?? '');
      }),
    [data, form],
  );

  const handleSubmit = (e) => {
    const payload = {
      storeName: form.storeName,
      shippingFee: Number(form.shippingFee || 0),
      freeShippingThreshold: Number(form.freeShippingThreshold || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      expiryWarningDays: Number(form.expiryWarningDays || 0),
      returnWindowDays: Number(form.returnWindowDays || 0),
      otpTtlMinutes: Number(form.otpTtlMinutes || 1),
      paymentTimeoutMinutes: Number(form.paymentTimeoutMinutes || 1),
      chatbotEnabled: !!form.chatbotEnabled,
      geminiModel: form.geminiModel || 'gemini-2.5-flash',
      ...(form.geminiApiKey !== undefined && form.geminiApiKey !== ''
        ? { geminiApiKey: form.geminiApiKey.trim() }
        : {}),
    };
    onSubmit(e, payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="adm-settings-groups">
        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Cửa hàng & Chính sách giao hàng</h3>
              <p>Tên hiển thị trên hóa đơn và biểu phí vận chuyển mặc định</p>
            </div>
            <span className="adm-stat-icon tone-0">
              <Store size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Tên nhà thuốc"
              name="storeName"
              value={form.storeName}
              onChange={onChange}
              required
              wide
              maxLength={100}
            />
            <Field
              label="Phí giao hàng mặc định (đ)"
              name="shippingFee"
              type="number"
              min={0}
              max={100000000}
              value={form.shippingFee}
              onChange={onChange}
              required
            />
            <Field
              label="Miễn phí giao hàng từ (đ)"
              name="freeShippingThreshold"
              type="number"
              min={0}
              max={100000000}
              value={form.freeShippingThreshold}
              onChange={onChange}
              required
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Kho hàng & Chính sách đổi trả</h3>
              <p>
                Ngưỡng cảnh báo tồn kho, cận hạn và thời gian đổi trả khách
                hàng
              </p>
            </div>
            <span className="adm-stat-icon tone-1">
              <Boxes size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Ngưỡng tồn kho thấp (đơn vị)"
              name="lowStockThreshold"
              type="number"
              min={0}
              max={3650}
              value={form.lowStockThreshold}
              onChange={onChange}
              required
              hint="Sản phẩm có tồn khả dụng nhỏ hơn ngưỡng này sẽ vào danh sách cảnh báo."
            />
            <Field
              label="Cảnh báo hạn dùng trước (ngày)"
              name="expiryWarningDays"
              type="number"
              min={0}
              max={3650}
              value={form.expiryWarningDays}
              onChange={onChange}
              required
              hint="Lô thuốc sắp hết hạn trong khoảng ngày này sẽ được cảnh báo sớm."
            />
            <Field
              label="Thời hạn gửi yêu cầu đổi trả (ngày)"
              name="returnWindowDays"
              type="number"
              min={0}
              max={3650}
              value={form.returnWindowDays}
              onChange={onChange}
              required
              wide
              hint="Số ngày kể từ khi giao thành công khách được phép gửi yêu cầu đổi trả."
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Bảo mật, Thanh toán & Trợ lý AI</h3>
              <p>
                Thời hạn mã OTP, giữ chỗ đơn hàng thanh toán trực tuyến và
                chatbot
              </p>
            </div>
            <span className="adm-stat-icon tone-3">
              <ShieldCheck size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Thời hạn hiệu lực OTP (phút)"
              name="otpTtlMinutes"
              type="number"
              min={1}
              max={3650}
              value={form.otpTtlMinutes}
              onChange={onChange}
              required
            />
            <Field
              label="Thời hạn thanh toán đơn trực tuyến (phút)"
              name="paymentTimeoutMinutes"
              type="number"
              min={1}
              max={3650}
              value={form.paymentTimeoutMinutes}
              onChange={onChange}
              required
            />
          </div>
          <div className="adm-settings-toggle-box">
            <CheckField
              label="Bật trợ lý tư vấn Chatbot AI trên cửa hàng"
              name="chatbotEnabled"
              value={form.chatbotEnabled}
              onChange={onChange}
              hint="Khi bật, Góc tư vấn sử dụng Gemini AI theo khóa đã cấu hình cùng cơ sở tri thức và quy tắc an toàn đã duyệt."
            />
          </div>
          <div className="adm-form-grid" style={{ marginTop: 12 }}>
            <Field
              label="Model Gemini AI"
              name="geminiModel"
              value={form.geminiModel || data?.geminiModel || 'gemini-2.5-flash'}
              onChange={onChange}
              placeholder="gemini-2.5-flash"
              hint={
                data?.geminiKeySource === 'env'
                  ? `Đang dùng Gemini API key có sẵn từ biến môi trường (${data?.geminiKeyMasked}).`
                  : data?.geminiKeySource === 'settings'
                    ? `Đang dùng Gemini API key đã lưu trong cấu hình (${data?.geminiKeyMasked}).`
                    : 'Chưa phát hiện biến môi trường GEMINI_API_KEY; có thể nhập key dự phòng bên cạnh.'
              }
            />
            <Field
              label="Gemini API Key dự phòng (tùy chọn)"
              name="geminiApiKey"
              type="password"
              value={form.geminiApiKey || ''}
              onChange={onChange}
              placeholder={
                data?.geminiConfigured
                  ? 'Để trống để giữ nguyên key hiện tại'
                  : 'Nhập Gemini API Key (AIza...)'
              }
              hint="Key lưu phía máy chủ, không lộ ra trình duyệt khách hàng."
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Dịch vụ tích hợp & Sao lưu hệ thống</h3>
              <p>
                Cấu hình khóa kết nối được thiết lập an toàn tại biến môi trường
                máy chủ
              </p>
            </div>
            <span className="adm-stat-icon tone-2">
              <Settings size={19} />
            </span>
          </div>
          <div className="adm-integration-state">
            <span>Môi trường thử nghiệm (Demo OTP / Thanh toán)</span>
            <Badge value={data?.demoMode ? 'active' : 'inactive'}>
              {data?.demoMode ? 'Đang bật' : 'Đã tắt'}
            </Badge>
          </div>
          <div className="adm-integration-list">
            {[
              ['Google Gemini AI', data?.geminiConfigured],
              ['Cổng thanh toán VNPay', data?.paymentConfigured],
              ['Đăng nhập Google OAuth', data?.googleConfigured],
              [
                'Gửi Email / SMTP OTP',
                data?.smtpConfigured ?? data?.emailConfigured,
              ],
            ].map(([name, configured]) => (
              <div key={name}>
                <span>{name}</span>
                <Badge value={configured ? 'active' : 'inactive'}>
                  {configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                </Badge>
              </div>
            ))}
          </div>
          <div className="adm-integration-meta">
            <span>
              Kênh thanh toán mặc định:{' '}
              <strong>
                {data?.paymentProvider === 'vnpay'
                  ? 'VNPay'
                  : data?.paymentProvider === 'demo'
                    ? 'Mô phỏng trình diễn'
                    : 'COD / Chuyển khoản'}
              </strong>
            </span>
            <span>
              Giới hạn tải tệp đơn thuốc:{' '}
              <strong>{data?.maxUploadMb || 5} MB</strong>
            </span>
          </div>
          {isAdmin && hasPermission('backup') && (
            <div className="adm-backup-actions">
              <button
                type="button"
                className="adm-btn"
                onClick={onOpenBackup}
              >
                <Download size={16} />
                Tải bản sao lưu mã hóa
              </button>
              <button
                type="button"
                className="adm-btn"
                onClick={onOpenRestore}
              >
                <RefreshCw size={16} />
                Phục hồi dữ liệu
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="adm-settings-footer">
        <div className="adm-settings-footer-status">
          {dirty ? (
            <span className="adm-dirty-pill">Có thay đổi chưa lưu</span>
          ) : (
            <span>
              Thay đổi cấu hình được ghi nhận tự động vào nhật ký hệ thống.
            </span>
          )}
        </div>
        <div className="adm-settings-footer-actions">
          {dirty && (
            <button
              type="button"
              className="adm-btn"
              onClick={onReset}
              disabled={saving}
            >
              <RotateCcw size={15} />
              Khôi phục lại
            </button>
          )}
          <button
            className="adm-btn primary"
            disabled={saving || !dirty}
            type="submit"
          >
            {saving ? (
              <LoaderCircle size={17} className="adm-spin" />
            ) : (
              <Check size={17} />
            )}
            Lưu cấu hình
          </button>
        </div>
      </div>
    </form>
  );
}
