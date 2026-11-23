/**
 * Admin Assisted Order Creation Modal Content View powered by useAdminCreateOrderController.
 */
import React from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { count, money, paymentLabel } from '../../models/formatters.js';
import { useAdminCreateOrderController } from '../../controllers/admin/useAdminCreateOrderController.js';
import { Table } from './adminUi.jsx';

export default function AdminCreateOrderModal({
  config,
  onClose,
  onCreated,
  notify,
}) {
  const c = useAdminCreateOrderController({ onCreated, notify });

  if (c.loadingLookup) {
    return (
      <div className="adm-modal-body">
        <div className="adm-loading">
          <LoaderCircle size={26} className="adm-spin" />
          <p>Đang tải danh sách khách hàng và sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={c.submitOrder}>
      <div className="adm-modal-body adm-ord-create-body">
        <div className="adm-info-banner compact">
          <Package size={18} />
          <p>
            Đơn tạo hộ hỗ trợ sản phẩm không kê đơn còn tồn kho. Giá bán,
            khuyến mãi và phân bổ lô FEFO do máy chủ tự động tính.
          </p>
        </div>

        <div className="adm-form-grid">
          <label className="adm-field">
            <span>
              Khách hàng <i>*</i>
            </span>
            <select
              value={c.userId}
              onChange={(e) => c.selectCustomer(e.target.value)}
              required
            >
              <option value="">Chọn khách hàng</option>
              {(c.lookup?.customers || []).map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.phone || cust.email})
                </option>
              ))}
            </select>
          </label>

          <label className="adm-field">
            <span>Địa chỉ đã lưu</span>
            <select
              value={c.addressId}
              onChange={(e) => c.selectSavedAddress(e.target.value)}
            >
              <option value="">Nhập địa chỉ mới</option>
              {(c.selectedCustomer?.addresses || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.recipient} · {a.line1}, {a.city}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!c.addressId && (
          <div className="adm-form-grid" style={{ marginTop: 12 }}>
            <label className="adm-field">
              <span>Người nhận *</span>
              <input
                required
                value={c.address.recipient}
                onChange={(e) =>
                  c.setAddress((a) => ({ ...a, recipient: e.target.value }))
                }
              />
            </label>
            <label className="adm-field">
              <span>SĐT nhận hàng *</span>
              <input
                required
                value={c.address.phone}
                onChange={(e) =>
                  c.setAddress((a) => ({ ...a, phone: e.target.value }))
                }
              />
            </label>
            <label className="adm-field is-wide">
              <span>Số nhà, tên đường *</span>
              <input
                required
                value={c.address.line1}
                onChange={(e) =>
                  c.setAddress((a) => ({ ...a, line1: e.target.value }))
                }
              />
            </label>
            <label className="adm-field">
              <span>Phường/Xã *</span>
              <input
                required
                value={c.address.ward}
                onChange={(e) =>
                  c.setAddress((a) => ({ ...a, ward: e.target.value }))
                }
              />
            </label>
            <label className="adm-field">
              <span>Tỉnh/Thành phố *</span>
              <input
                required
                value={c.address.city}
                onChange={(e) =>
                  c.setAddress((a) => ({ ...a, city: e.target.value }))
                }
              />
            </label>
          </div>
        )}

        <div className="adm-ord-picker">
          <label className="adm-field">
            <span>Tìm &amp; thêm sản phẩm không kê đơn</span>
            <input
              value={c.productQuery}
              onChange={(e) => c.setProductQuery(e.target.value)}
              placeholder="Gõ tên thuốc, hoạt chất..."
            />
          </label>
          <div className="adm-ord-picker-list">
            {c.filteredProducts.map((p) => (
              <div key={p.id} className="adm-ord-picker-row">
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {money(p.price)} / {p.unit} · Tồn: {count(p.stock)}
                  </small>
                </div>
                <button
                  type="button"
                  className="adm-btn small"
                  onClick={() => c.addItem(p)}
                >
                  <Plus size={13} />
                  Thêm
                </button>
              </div>
            ))}
          </div>
        </div>

        {c.items.length > 0 && (
          <Table
            columns={[
              'Sản phẩm đã chọn',
              'Đơn giá',
              'Số lượng',
              'Thành tiền',
              '',
            ]}
            rows={c.items}
          >
            {c.items.map((row) => (
              <tr key={row.productId}>
                <td>
                  <strong>{row.product.name}</strong>
                  <small>
                    {row.product.unit} · Tồn {row.product.stock}
                  </small>
                </td>
                <td>{money(row.product.price)}</td>
                <td>
                  <input
                    type="number"
                    className="adm-ord-qty-input"
                    min="1"
                    max={row.product.stock}
                    value={row.quantity}
                    onChange={(e) =>
                      c.updateItemQuantity(
                        row.productId,
                        row.product.stock,
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td className="adm-amount">
                  {money(row.product.price * row.quantity)}
                </td>
                <td>
                  <button
                    type="button"
                    className="adm-icon-btn danger"
                    onClick={() => c.removeItem(row.productId)}
                    aria-label="Xóa dòng"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <div className="adm-form-grid" style={{ marginTop: 14 }}>
          <label className="adm-field">
            <span>Phương thức thanh toán</span>
            <select
              value={c.paymentMethod}
              onChange={(e) => c.setPaymentMethod(e.target.value)}
            >
              {(config?.paymentMethods || ['cod'])
                .filter((m) => m !== 'vnpay')
                .map((m) => (
                  <option key={m} value={m}>
                    {paymentLabel(m)}
                  </option>
                ))}
            </select>
          </label>

          <div className="adm-field">
            <span>Mã khuyến mãi</span>
            <div className="adm-ord-promo-row">
              <input
                value={c.promoCode}
                onChange={(e) => c.setPromoCode(e.target.value)}
                placeholder="VD: KHOEMANH10"
              />
              <button
                type="button"
                className="adm-btn small"
                onClick={c.checkPromo}
              >
                Kiểm tra
              </button>
            </div>
          </div>

          <label className="adm-field">
            <span>Ghi chú đơn hàng</span>
            <input
              value={c.note}
              onChange={(e) => c.setNote(e.target.value)}
              placeholder="Giao giờ hành chính..."
            />
          </label>

          <label className="adm-field">
            <span>Ghi chú nội bộ</span>
            <input
              value={c.internalNote}
              onChange={(e) => c.setInternalNote(e.target.value)}
              placeholder="Khách đặt qua điện thoại..."
            />
          </label>
        </div>

        {c.paymentMethod === 'cod' && (
          <label className="adm-check">
            <input
              type="checkbox"
              checked={c.autoConfirm}
              onChange={(e) => c.setAutoConfirm(e.target.checked)}
            />
            <span>Xác nhận và xuất kho FEFO ngay sau khi tạo đơn COD</span>
          </label>
        )}

        <div className="adm-order-totals">
          <div>
            <span>Tạm tính</span>
            <span>{money(c.subtotal)}</span>
          </div>
          <div>
            <span>Phí giao hàng</span>
            <span>{money(c.shippingFee)}</span>
          </div>
          <div>
            <span>Giảm giá</span>
            <span>−{money(c.discount)}</span>
          </div>
          <div className="total">
            <strong>Tổng thanh toán</strong>
            <strong>{money(c.total)}</strong>
          </div>
        </div>
      </div>

      <div className="adm-modal-footer">
        <button type="button" className="adm-btn" onClick={onClose}>
          Đóng
        </button>
        <button
          type="submit"
          className="adm-btn primary"
          disabled={c.submitting || !c.items.length}
        >
          {c.submitting ? (
            <LoaderCircle size={16} className="adm-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          Tạo đơn hàng
        </button>
      </div>
    </form>
  );
}
