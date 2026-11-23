/**
 * Admin Modals View: cleanly decomposed modal components dispatched by modal.type.
 */
import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Check,
  ClipboardCheck,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AUDIT_LABELS,
  ENTITY_LABELS,
  PERMISSION_LABELS,
  RETURN_GOODS_ACTION,
  RETURN_GOODS_NEXT,
  RX_QUICK_NOTES,
  adminLabel,
} from '../../models/constants.js';
import {
  count,
  dateTime,
  fmtDate,
  formatAuditDetail,
  money,
  vnDate,
} from '../../models/formatters.js';
import { buildDefaultRolePermissions } from '../../models/adminModel.js';
import SupportChat from '../components/SupportChat.jsx';
import AdminCreateOrderModal from './AdminCreateOrderModal.jsx';
import AdminOrderDetailModal from './AdminOrderDetailModal.jsx';
import { Badge, CheckField, Field, Modal, Table } from './adminUi.jsx';

function ModalFooter({ close, saving, saveLabel = 'Lưu thay đổi' }) {
  return (
    <div className="adm-modal-footer">
      <button type="button" className="adm-btn" onClick={close}>
        Đóng
      </button>
      <button className="adm-btn primary" disabled={saving} type="submit">
        {saving ? (
          <LoaderCircle className="adm-spin" size={16} />
        ) : (
          <Check size={16} />
        )}{' '}
        {saveLabel}
      </button>
    </div>
  );
}

function renderFields(defs, form, change) {
  return defs.map(
    ([name, title, type = 'text', required = false, extra = {}]) => (
      <Field
        key={name}
        name={name}
        label={title}
        type={type}
        value={form[name]}
        onChange={change}
        required={required}
        {...extra}
      />
    ),
  );
}

function ProductModal({ item, form, change, categories, manufacturers, submit, close, saving }) {
  const edit = !!item.id;
  const numPrice = Number(form.price || 0);
  const numOldPrice = Number(form.oldPrice || 0);
  const discountPreview =
    numOldPrice > numPrice && numPrice > 0
      ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
      : 0;
  const oldPriceInvalid = numOldPrice > 0 && numOldPrice <= numPrice;

  return (
    <Modal
      title={edit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      onClose={close}
      wide
    >
      <form
        onSubmit={(e) =>
          submit(
            e,
            `/admin/products${edit ? `/${item.id}` : ''}`,
            edit ? 'PATCH' : 'POST',
            {
              ...form,
              price: Number(form.price),
              oldPrice: Number(form.oldPrice) > 0 ? Number(form.oldPrice) : null,
              categoryId: Number(form.categoryId),
              manufacturerId: form.manufacturerId
                ? Number(form.manufacturerId)
                : null,
            },
          )
        }
      >
        <div className="adm-modal-body adm-form-grid">
          {renderFields(
            [
              ['name', 'Tên sản phẩm', 'text', true, { wide: true }],
              ['slug', 'Mã đường dẫn (để trống để tự tạo)'],
              ['unit', 'Đơn vị bán', 'text', true],
              ['price', 'Giá bán (đ)', 'number', true, { min: 1 }],
              [
                'oldPrice',
                'Giá niêm yết (đ, bỏ trống nếu không giảm)',
                'number',
                false,
                { min: 0 },
              ],
            ],
            form,
            change,
          )}
          {(discountPreview > 0 || oldPriceInvalid) && (
            <div
              className={`adm-field is-wide adm-inline-note ${oldPriceInvalid ? 'is-warn' : 'is-ok'}`}
            >
              {oldPriceInvalid
                ? 'Lưu ý: Giá niêm yết nên lớn hơn giá bán để hiển thị phần trăm giảm giá hợp lệ.'
                : `Hiển thị giảm ${discountPreview}% so với giá niêm yết (${money(numOldPrice)} → ${money(numPrice)}).`}
            </div>
          )}
          <Field label="Danh mục" required>
            <select
              name="categoryId"
              value={form.categoryId || ''}
              onChange={change}
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhà sản xuất">
            <select
              name="manufacturerId"
              value={form.manufacturerId || ''}
              onChange={change}
            >
              <option value="">Chọn nhà sản xuất</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          {renderFields(
            [
              [
                'ingredient',
                'Thành phần / hoạt chất',
                'text',
                false,
                { wide: true },
              ],
              [
                'image',
                'Đường dẫn ảnh (/assets/... hoặc https://...)',
                'text',
                false,
                { wide: true },
              ],
            ],
            form,
            change,
          )}
          {form.image && (
            <div className="adm-field is-wide">
              <div className="adm-img-preview">
                <img
                  src={form.image}
                  alt="Xem trước ảnh sản phẩm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <strong>Xem trước hình ảnh</strong>
                  <small>{form.image}</small>
                </div>
              </div>
            </div>
          )}
          {renderFields(
            [
              [
                'description',
                'Mô tả sản phẩm',
                'textarea',
                false,
                { wide: true },
              ],
              [
                'usage',
                'Thông tin sử dụng',
                'textarea',
                false,
                { wide: true },
              ],
              [
                'warning',
                'Cảnh báo, lưu ý',
                'textarea',
                false,
                { wide: true },
              ],
            ],
            form,
            change,
          )}
          <CheckField
            name="prescriptionRequired"
            label="Sản phẩm cần đơn thuốc"
            value={form.prescriptionRequired}
            onChange={change}
          />
          <CheckField
            name="featured"
            label="Sản phẩm nổi bật"
            value={form.featured}
            onChange={change}
          />
          <CheckField
            name="active"
            label="Hiển thị trên cửa hàng"
            value={form.active !== false}
            onChange={change}
          />
        </div>
        <ModalFooter
          close={close}
          saving={saving}
          saveLabel={edit ? 'Lưu sản phẩm' : 'Tạo sản phẩm'}
        />
      </form>
    </Modal>
  );
}

function PromotionModal({
  item,
  form,
  setForm,
  change,
  products = [],
  combos = [],
  submit,
  close,
  saving,
}) {
  const [targetSearch, setTargetSearch] = React.useState('');
  const edit = !!item.id;
  const invalidDates =
    form.startDate && form.endDate && form.startDate > form.endDate;
  const minLimit = edit ? Math.max(1, Number(item.usedCount || 1)) : 1;
  const applyScope = form.applyScope || 'order';
  const selectedIds = Array.isArray(form.targetIds)
    ? form.targetIds.map(Number)
    : [];
  const needTargets = applyScope === 'product' && selectedIds.length === 0;

  const toggleTarget = (id) => {
    const numId = Number(id);
    setForm((prev) => {
      const cur = Array.isArray(prev.targetIds)
        ? prev.targetIds.map(Number)
        : [];
      const next = cur.includes(numId)
        ? cur.filter((x) => x !== numId)
        : [...cur, numId];
      return { ...prev, targetIds: next };
    });
  };

  const candidates = (applyScope === 'combo' ? combos : products).filter(
    (entry) => {
      if (!targetSearch.trim()) return true;
      return String(entry.name || '')
        .toLowerCase()
        .includes(targetSearch.trim().toLowerCase());
    },
  );

  return (
    <Modal
      title={edit ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
      onClose={close}
      wide
    >
      <form
        onSubmit={(e) =>
          submit(
            e,
            `/admin/promotions${edit ? `/${item.id}` : ''}`,
            edit ? 'PATCH' : 'POST',
            {
              ...form,
              code: String(form.code || '').trim().toUpperCase(),
              value: Number(form.value),
              minOrder: Number(form.minOrder) || 0,
              maxDiscount:
                Number(form.maxDiscount) > 0 ? Number(form.maxDiscount) : null,
              usageLimit: Number(form.usageLimit) || 100,
              applyScope,
              targetIds: applyScope === 'order' ? [] : selectedIds,
            },
          )
        }
      >
        <div className="adm-modal-body adm-form-grid">
          {renderFields(
            [
              [
                'code',
                'Mã giảm giá (chữ in hoa, số, _, -)',
                'text',
                true,
                { style: { textTransform: 'uppercase' } },
              ],
              ['name', 'Tên khuyến mãi', 'text', true],
            ],
            form,
            change,
          )}
          <Field label="Phạm vi áp dụng" wide>
            <select
              name="applyScope"
              value={applyScope}
              onChange={(e) => {
                const nextScope = e.target.value;
                setTargetSearch('');
                setForm((prev) => ({
                  ...prev,
                  applyScope: nextScope,
                  targetIds: [],
                }));
              }}
            >
              <option value="order">Tổng giá trị đơn hàng</option>
              <option value="product">Sản phẩm nhất định</option>
              <option value="combo">Combo sản phẩm</option>
            </select>
          </Field>
          {applyScope !== 'order' && (
            <div className="adm-field is-wide adm-scope-picker">
              <div className="adm-scope-picker-head">
                <span>
                  {applyScope === 'combo'
                    ? `Chọn combo áp dụng (${selectedIds.length ? `Đã chọn ${selectedIds.length}` : 'Bỏ trống = áp dụng mọi combo'})`
                    : `Chọn sản phẩm áp dụng (Đã chọn ${selectedIds.length}) *`}
                </span>
                <input
                  type="search"
                  placeholder={
                    applyScope === 'combo' ? 'Lọc combo...' : 'Lọc sản phẩm...'
                  }
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                />
              </div>
              <div className="adm-scope-picker-list">
                {candidates.length === 0 ? (
                  <small className="muted">Không có mục phù hợp.</small>
                ) : (
                  candidates.map((entry) => {
                    const checked = selectedIds.includes(Number(entry.id));
                    return (
                      <label key={entry.id} className="adm-scope-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(entry.id)}
                        />
                        <span>{entry.name}</span>
                        <small>{money(entry.price)}</small>
                      </label>
                    );
                  })
                )}
              </div>
              {needTargets && (
                <small className="adm-field-error">
                  Vui lòng chọn ít nhất 1 sản phẩm áp dụng.
                </small>
              )}
            </div>
          )}
          <Field label="Hình thức giảm">
            <select
              name="type"
              value={form.type || 'percent'}
              onChange={change}
            >
              <option value="percent">Theo phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (đ)</option>
            </select>
          </Field>
          {renderFields(
            [
              [
                'value',
                form.type === 'percent'
                  ? 'Phần trăm giảm (%)'
                  : 'Số tiền giảm (đ)',
                'number',
                true,
                { min: 1, max: form.type === 'percent' ? 100 : undefined },
              ],
              [
                'minOrder',
                applyScope === 'order'
                  ? 'Giá trị đơn tối thiểu (đ)'
                  : 'Giá trị hàng áp dụng tối thiểu (đ)',
                'number',
                false,
                { min: 0 },
              ],
              [
                'maxDiscount',
                'Giảm tối đa (đ, bỏ trống hoặc 0: không giới hạn)',
                'number',
                false,
                { min: 0 },
              ],
              [
                'usageLimit',
                'Giới hạn lượt dùng',
                'number',
                true,
                { min: minLimit },
              ],
              ['startDate', 'Bắt đầu', 'date', true],
              ['endDate', 'Kết thúc', 'date', true],
            ],
            form,
            change,
          )}
          {invalidDates && (
            <div className="adm-field is-wide adm-inline-note is-warn">
              Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
            </div>
          )}
          <CheckField
            label="Kích hoạt khuyến mãi"
            name="active"
            value={form.active}
            onChange={change}
          />
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>
            Đóng
          </button>
          <button
            className="adm-btn primary"
            disabled={saving || invalidDates || needTargets}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="adm-spin" size={16} />
            ) : (
              <Check size={16} />
            )}{' '}
            {edit ? 'Lưu khuyến mãi' : 'Tạo khuyến mãi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ComboModal({
  item,
  form,
  setForm,
  change,
  products = [],
  submit,
  close,
  saving,
}) {
  const edit = !!item.id;
  const rows =
    Array.isArray(form.items) && form.items.length
      ? form.items
      : [
          { productId: '', quantity: 1 },
          { productId: '', quantity: 1 },
        ];
  const productMap = new Map(products.map((p) => [Number(p.id), p]));

  const updateRow = (idx, field, val) => {
    setForm((prev) => {
      const next = [...(prev.items || rows)];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, items: next };
    });
  };
  const addRow = () =>
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items || rows), { productId: '', quantity: 1 }],
    }));
  const removeRow = (idx) =>
    setForm((prev) => ({
      ...prev,
      items: (prev.items || rows).filter((_, i) => i !== idx),
    }));

  const validItems = rows
    .map((r) => ({
      productId: Number(r.productId),
      quantity: Math.max(1, Number(r.quantity) || 1),
      product: productMap.get(Number(r.productId)),
    }))
    .filter((r) => r.productId > 0 && r.product);

  const originalPrice = validItems.reduce(
    (s, r) => s + Number(r.product.price || 0) * r.quantity,
    0,
  );
  const availableStock = validItems.length
    ? Math.min(
        ...validItems.map((r) =>
          Math.floor(Number(r.product.stock || 0) / r.quantity),
        ),
      )
    : 0;
  const comboPrice = Number(form.price || 0);
  const savings = Math.max(0, originalPrice - comboPrice);
  const hasDuplicates =
    new Set(validItems.map((r) => r.productId)).size !== validItems.length;
  const totalQty = validItems.reduce((s, r) => s + r.quantity, 0);
  const invalidCombo =
    !validItems.length ||
    (validItems.length < 2 && totalQty < 2) ||
    hasDuplicates;

  return (
    <Modal
      title={edit ? 'Chỉnh sửa Combo sản phẩm' : 'Tạo Combo sản phẩm mới'}
      onClose={close}
      wide
    >
      <form
        onSubmit={(e) =>
          submit(
            e,
            `/admin/combos${edit ? `/${item.id}` : ''}`,
            edit ? 'PATCH' : 'POST',
            {
              name: String(form.name || '').trim(),
              description: String(form.description || '').trim(),
              image: String(form.image || '').trim(),
              price: Number(form.price || 0),
              active: form.active !== false,
              items: validItems.map(({ productId, quantity }) => ({
                productId,
                quantity,
              })),
            },
          )
        }
      >
        <div className="adm-modal-body adm-form-grid">
          <Field
            label="Tên gói Combo"
            name="name"
            value={form.name}
            onChange={change}
            required
            wide
            placeholder="VD: Combo Tăng Đề Kháng Toàn Diện"
          />
          <Field
            label="Mô tả ngắn"
            name="description"
            type="textarea"
            value={form.description}
            onChange={change}
            wide
            placeholder="Công dụng và lợi ích khi mua trọn gói combo..."
          />
          <Field
            label="Ảnh đại diện (URL)"
            name="image"
            value={form.image}
            onChange={change}
            placeholder="/assets/products/vitamin-c.svg"
          />
          <Field
            label="Giá bán Combo (đ)"
            name="price"
            type="number"
            min={0}
            value={form.price}
            onChange={change}
            required
            hint={
              originalPrice > 0
                ? `Tổng giá lẻ: ${money(originalPrice)} · Tiết kiệm ${money(savings)}`
                : 'Chọn sản phẩm thành phần để xem tổng giá lẻ.'
            }
          />
          {originalPrice > 0 && (
            <div className="adm-field is-wide adm-combo-presets">
              <span>Gợi ý giá nhanh từ tổng giá lẻ ({money(originalPrice)}):</span>
              {[5, 10, 15, 20].map((pct) => {
                const suggested =
                  Math.round((originalPrice * (100 - pct)) / 100 / 1000) * 1000;
                return (
                  <button
                    key={pct}
                    type="button"
                    className="adm-quick-chip"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, price: suggested }))
                    }
                  >
                    Giảm {pct}% ({money(suggested)})
                  </button>
                );
              })}
            </div>
          )}

          <div className="adm-field is-wide adm-combo-builder">
            <div className="adm-combo-builder-head">
              <strong>Thành phần tổ hợp sản phẩm</strong>
              <button
                type="button"
                className="adm-btn small"
                onClick={addRow}
              >
                <Plus size={14} /> Thêm sản phẩm
              </button>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="adm-combo-row">
                <select
                  value={row.productId || ''}
                  onChange={(e) =>
                    updateRow(idx, 'productId', Number(e.target.value) || '')
                  }
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.price)} (Tồn: {p.stock})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={row.quantity || 1}
                  onChange={(e) =>
                    updateRow(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))
                  }
                  aria-label="Số lượng trong combo"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="adm-icon-btn"
                    onClick={() => removeRow(idx)}
                    aria-label="Xóa dòng"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            <div className="adm-combo-summary-strip">
              <span>
                Tổng giá lẻ: <strong>{money(originalPrice)}</strong>
              </span>
              <span>
                Tồn combo khả dụng: <strong>{count(availableStock)}</strong> gói
              </span>
            </div>
            {hasDuplicates && (
              <small className="adm-field-error">
                Không được chọn trùng cùng một sản phẩm trong combo.
              </small>
            )}
          </div>

          <CheckField
            label="Mở bán combo trên cửa hàng"
            name="active"
            value={form.active !== false}
            onChange={change}
          />
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>
            Đóng
          </button>
          <button
            className="adm-btn primary"
            disabled={saving || invalidCombo}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="adm-spin" size={16} />
            ) : (
              <Check size={16} />
            )}{' '}
            {edit ? 'Lưu Combo' : 'Tạo Combo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReceiptModal({ form, setForm, change, products, suppliers, submit, close, saving }) {
  const todayVn = vnDate(0);
  const activeSuppliers = suppliers.filter((s) => s.active !== false);
  const rows =
    Array.isArray(form.items) && form.items.length
      ? form.items
      : [
          {
            productId: products[0]?.id || '',
            batchNumber: '',
            quantity: 10,
            cost: '',
            manufacturedAt: todayVn,
            expiresAt: vnDate(365),
          },
        ];
  const updateRow = (idx, key, value) =>
    setForm((f) => ({
      ...f,
      items: rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    }));
  const addRow = () =>
    setForm((f) => ({
      ...f,
      items: [
        ...rows,
        {
          productId: products[0]?.id || '',
          batchNumber: '',
          quantity: 10,
          cost: '',
          manufacturedAt: todayVn,
          expiresAt: vnDate(365),
        },
      ],
    }));
  const removeRow = (idx) =>
    setForm((f) => ({
      ...f,
      items: rows.filter((_, i) => i !== idx),
    }));
  const receiptTotal = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.cost) || 0),
    0,
  );
  const hasDateIssue = rows.some(
    (r) =>
      (r.manufacturedAt && r.manufacturedAt > todayVn) ||
      (r.expiresAt && r.expiresAt <= todayVn) ||
      (r.manufacturedAt && r.expiresAt && r.manufacturedAt >= r.expiresAt),
  );

  return (
    <Modal title="Nhập kho theo lô (nhiều mặt hàng)" onClose={close} wide>
      <form
        onSubmit={(e) =>
          submit(e, '/admin/inventory/receipts', 'POST', {
            supplierId: Number(form.supplierId),
            items: rows.map((r) => ({
              productId: Number(r.productId),
              batchNumber: String(r.batchNumber || '').trim(),
              quantity: Number(r.quantity),
              cost: Number(r.cost || 0),
              manufacturedAt: r.manufacturedAt,
              expiresAt: r.expiresAt,
            })),
          })
        }
      >
        <div className="adm-modal-body">
          <div className="adm-info-banner compact">
            <Boxes size={18} />
            <p>
              Không nhập lô đã hết hạn. Hàng xuất bán tự động ưu tiên theo hạn
              dùng gần nhất (FEFO).
            </p>
          </div>
          <Field label="Nhà cung cấp" required>
            <select
              name="supplierId"
              value={form.supplierId || ''}
              onChange={change}
              required
            >
              <option value="">Chọn nhà cung cấp</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="adm-receipt-rows">
            {rows.map((row, idx) => (
              <div className="adm-receipt-row" key={idx}>
                <div className="adm-receipt-row-head">
                  <strong>Dòng lô #{idx + 1}</strong>
                  <div className="adm-receipt-row-right">
                    <span>
                      Thành tiền:{' '}
                      <b>
                        {money(
                          (Number(row.quantity) || 0) * (Number(row.cost) || 0),
                        )}
                      </b>
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="adm-icon-btn danger"
                        onClick={() => removeRow(idx)}
                        aria-label={`Xóa dòng ${idx + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="adm-form-grid">
                  <Field label="Sản phẩm" required wide>
                    <select
                      value={row.productId || ''}
                      onChange={(e) =>
                        updateRow(idx, 'productId', e.target.value)
                      }
                      required
                    >
                      <option value="">Chọn sản phẩm</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Mã lô"
                    value={row.batchNumber}
                    onChange={(e) =>
                      updateRow(idx, 'batchNumber', e.target.value)
                    }
                    placeholder="VD: LOT-2026-01"
                    required
                  />
                  <Field
                    label="Số lượng nhập"
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                    required
                  />
                  <Field
                    label="Đơn giá nhập (đ)"
                    type="number"
                    min={0}
                    value={row.cost}
                    onChange={(e) => updateRow(idx, 'cost', e.target.value)}
                    required
                  />
                  <Field
                    label="Ngày sản xuất"
                    type="date"
                    max={todayVn}
                    value={row.manufacturedAt}
                    onChange={(e) =>
                      updateRow(idx, 'manufacturedAt', e.target.value)
                    }
                    required
                  />
                  <Field
                    label="Hạn sử dụng"
                    type="date"
                    value={row.expiresAt}
                    onChange={(e) =>
                      updateRow(idx, 'expiresAt', e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="adm-receipt-bar">
            <button
              type="button"
              className="adm-btn"
              onClick={addRow}
              disabled={rows.length >= 100}
            >
              <Plus size={15} />
              Thêm dòng lô
            </button>
            <div className="adm-receipt-total">
              <span>Tổng giá trị phiếu nhập ({rows.length} dòng)</span>
              <strong>{money(receiptTotal)}</strong>
            </div>
          </div>
          {hasDateIssue && (
            <div className="adm-inline-note is-warn">
              Kiểm tra lại ngày sản xuất (≤ hôm nay) và hạn sử dụng (&gt; hôm
              nay và lớn hơn ngày sản xuất).
            </div>
          )}
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>
            Đóng
          </button>
          <button
            className="adm-btn primary"
            disabled={saving || hasDateIssue}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="adm-spin" size={16} />
            ) : (
              <Check size={16} />
            )}{' '}
            Xác nhận nhập kho
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AdjustmentModal({ item, form, change, submit, close, saving }) {
  const curQty = Number(item.currentQuantity ?? 0);
  const reserved = Number(item.reserved ?? 0);
  const delta = Number(form.quantity || 0);
  const nextQty = curQty + delta;
  const belowReserved = nextQty < reserved;
  const invalidDelta = !Number.isSafeInteger(delta) || delta === 0;
  const shortReason = String(form.reason || '').trim().length < 5;

  return (
    <Modal title="Điều chỉnh tồn kho lô" onClose={close}>
      <form
        onSubmit={(e) =>
          submit(e, '/admin/inventory/adjustments', 'POST', {
            batchId: item.batchId,
            quantity: delta,
            reason: form.reason,
          })
        }
      >
        <div className="adm-modal-body">
          <div className="adm-adjust-summary">
            <div>
              <strong>{item.productName}</strong>
              <small>
                Lô {item.batchNumber}
                {item.expiresAt ? ` · HSD ${fmtDate(item.expiresAt)}` : ''}
              </small>
            </div>
            <div className="adm-adjust-nums">
              <span>
                Hiện có: <b>{count(curQty)}</b>
              </span>
              <span>
                Đang giữ: <b>{count(reserved)}</b>
              </span>
              <span>
                Sau điều chỉnh:{' '}
                <b className={belowReserved ? 'adm-red' : 'adm-green'}>
                  {count(nextQty)}
                </b>
              </span>
            </div>
          </div>
          {renderFields(
            [
              [
                'quantity',
                'Số lượng thay đổi (+ tăng, − giảm)',
                'number',
                true,
                { step: 1 },
              ],
              [
                'reason',
                'Lý do điều chỉnh (tối thiểu 5 ký tự)',
                'textarea',
                true,
                { minLength: 5 },
              ],
            ],
            form,
            change,
          )}
          {belowReserved && (
            <div className="adm-inline-note is-warn">
              Không thể giảm tồn xuống dưới số lượng đang giữ cho đơn (
              {count(reserved)}).
            </div>
          )}
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>
            Đóng
          </button>
          <button
            className="adm-btn primary"
            disabled={saving || belowReserved || invalidDelta || shortReason}
            type="submit"
          >
            {saving ? (
              <LoaderCircle className="adm-spin" size={16} />
            ) : (
              <Check size={16} />
            )}{' '}
            Xác nhận điều chỉnh
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UserPermissionsModal({ item, user, form, setForm, change, submit, close, saving }) {
  const isSelf = item.id === user.id;
  const curPerms = Array.isArray(form.permissions) ? form.permissions : [];

  return (
    <Modal title="Chỉnh sửa tài khoản & phân quyền" onClose={close}>
      <form
        onSubmit={(e) =>
          submit(e, `/admin/users/${item.id}`, 'PATCH', {
            role: form.role,
            name: form.name,
            phone: form.phone,
            active: isSelf ? true : form.active,
            reason: form.reason,
            jobTitle: form.role === 'staff' ? form.jobTitle || 'sales' : null,
            permissions:
              form.role !== 'customer'
                ? curPerms.filter(
                    (code) =>
                      code !== 'prescriptions' ||
                      (form.role === 'staff' && form.jobTitle === 'pharmacist'),
                  )
                : [],
          })
        }
      >
        <div className="adm-modal-body">
          <div className="adm-profile-summary">
            <span>{item.name?.[0] || 'A'}</span>
            <div>
              <strong>
                {item.name}
                {isSelf ? ' (Tài khoản của bạn)' : ''}
              </strong>
              <p>{item.email}</p>
            </div>
          </div>
          {renderFields(
            [
              ['name', 'Họ tên', 'text', true],
              ['phone', 'Số điện thoại', 'tel', false],
            ],
            form,
            change,
          )}
          <Field label="Vai trò">
            <select
              name="role"
              value={form.role}
              disabled={isSelf}
              onChange={(e) => {
                const nextRole = e.target.value;
                setForm((f) => {
                  const nextTitle =
                    nextRole === 'staff' ? f.jobTitle || 'sales' : null;
                  const prevPerms = Array.isArray(f.permissions)
                    ? f.permissions
                    : [];
                  const nextPerms =
                    nextRole === 'customer'
                      ? []
                      : prevPerms.length === 0
                        ? buildDefaultRolePermissions(nextRole, nextTitle)
                        : prevPerms.filter(
                            (p) =>
                              p !== 'prescriptions' ||
                              (nextRole === 'staff' &&
                                nextTitle === 'pharmacist'),
                          );
                  return {
                    ...f,
                    role: nextRole,
                    jobTitle: nextTitle,
                    permissions: nextPerms,
                  };
                });
              }}
            >
              {['customer', 'staff', 'admin'].map((r) => (
                <option key={r} value={r}>
                  {adminLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          {form.role === 'staff' && (
            <Field label="Chức danh">
              <select
                name="jobTitle"
                value={form.jobTitle || 'sales'}
                onChange={(e) => {
                  const nextTitle = e.target.value;
                  setForm((f) => ({
                    ...f,
                    jobTitle: nextTitle,
                    permissions:
                      nextTitle === 'pharmacist'
                        ? f.permissions || []
                        : (f.permissions || []).filter(
                            (p) => p !== 'prescriptions',
                          ),
                  }));
                }}
              >
                {['pharmacist', 'sales', 'warehouse'].map((r) => (
                  <option key={r} value={r}>
                    {adminLabel(r)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.role !== 'customer' && (
            <div className="adm-permission-box">
              <div className="adm-permission-head">
                <div>
                  <h3>Quyền thực hiện chức năng</h3>
                  <p>
                    Quyền duyệt đơn thuốc chỉ áp dụng khi chức danh là dược sĩ.
                  </p>
                </div>
                <button
                  type="button"
                  className="adm-btn small"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      permissions: buildDefaultRolePermissions(
                        f.role,
                        f.jobTitle,
                      ),
                    }))
                  }
                >
                  Quyền mặc định
                </button>
              </div>
              <div className="adm-permission-grid">
                {Object.entries(PERMISSION_LABELS).map(([key, title]) => {
                  const lockedSelfUsers = isSelf && key === 'users';
                  const lockedRx =
                    key === 'prescriptions' &&
                    (form.role !== 'staff' || form.jobTitle !== 'pharmacist');
                  return (
                    <label
                      className={`adm-check ${lockedSelfUsers || lockedRx ? 'is-disabled' : ''}`}
                      key={key}
                    >
                      <input
                        type="checkbox"
                        disabled={lockedSelfUsers || lockedRx}
                        checked={curPerms.includes(key)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            permissions: e.target.checked
                              ? [...new Set([...(f.permissions || []), key])]
                              : (f.permissions || []).filter((p) => p !== key),
                          }))
                        }
                      />
                      <span>{title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <CheckField
            label="Tài khoản được hoạt động"
            name="active"
            value={form.active}
            disabled={isSelf}
            hint={
              isSelf
                ? 'Không thể tự khóa tài khoản quản trị đang đăng nhập.'
                : undefined
            }
            onChange={change}
          />
          {!isSelf &&
            !form.active &&
            item.active &&
            renderFields(
              [
                [
                  'reason',
                  'Lý do khóa tài khoản',
                  'textarea',
                  true,
                  { minLength: 5, maxLength: 500 },
                ],
              ],
              form,
              change,
            )}
          <div className="adm-info-banner compact">
            <ShieldCheck size={18} />
            <p>
              Chỉ nhân viên có chức danh dược sĩ và quyền kiểm duyệt được duyệt
              đơn thuốc. Hệ thống bảo vệ tài khoản quản trị cuối cùng.
            </p>
          </div>
        </div>
        <ModalFooter
          close={close}
          saving={saving}
          saveLabel="Cập nhật tài khoản"
        />
      </form>
    </Modal>
  );
}

function PrescriptionReviewModal({ item, form, setForm, change, orderDetail, submit, close, saving }) {
  const canReview =
    item.status === 'pending' && item.orderStatus === 'pending_prescription';
  const rxItems = Array.isArray(item.items) ? item.items : [];
  const selectedIds = Array.isArray(form.productIds) ? form.productIds : [];
  const approvedIds = Array.isArray(item.approvedProductIds)
    ? item.approvedProductIds
    : [];
  const partialInvalid =
    form.status === 'partial' &&
    (selectedIds.length === 0 || selectedIds.length >= rxItems.length);

  return (
    <Modal title={`Kiểm duyệt đơn thuốc #${item.id}`} onClose={close} wide>
      <form
        onSubmit={(e) =>
          submit(e, `/admin/prescriptions/${item.id}`, 'PATCH', {
            status: form.status,
            note: form.note,
            productIds: selectedIds,
          })
        }
      >
        <div className="adm-modal-body">
          <div className="adm-rx-header">
            <div>
              <strong>
                {item.userName || item.customerName || 'Khách hàng'}
                {item.userPhone ? ` · ${item.userPhone}` : ''}
              </strong>
              <small>
                Tải lên {dateTime(item.createdAt)}
                {item.orderTotal ? ` · Tổng đơn ${money(item.orderTotal)}` : ''}
              </small>
            </div>
            <Badge value={item.status}>
              {item.status === 'pending' ? 'Chờ duyệt' : undefined}
            </Badge>
            {item.orderId && (
              <button
                type="button"
                className="adm-btn small"
                onClick={() =>
                  orderDetail({ id: item.orderId, code: item.orderCode })
                }
              >
                Đơn {item.orderCode || `#${item.orderId}`}
                <ArrowUpRight size={14} />
              </button>
            )}
            <a
              className="adm-btn small"
              href={`/api/prescriptions/${item.id}/file`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              Mở tệp gốc
            </a>
          </div>
          <div className="adm-rx-preview">
            {(item.mimeType || '').includes('pdf') ||
            /\.pdf$/i.test(item.originalName || item.fileName || '') ? (
              <iframe
                title="Nội dung đơn thuốc"
                src={`/api/prescriptions/${item.id}/file`}
              />
            ) : (
              <img
                alt="Đơn thuốc của khách hàng"
                src={`/api/prescriptions/${item.id}/file`}
              />
            )}
          </div>
          {rxItems.length > 0 && (
            <Table
              columns={[
                'Thuốc kê đơn cần đối chiếu',
                'Số lượng',
                ...(item.status === 'partial' ? ['Kết quả'] : []),
              ]}
              rows={rxItems}
            >
              {rxItems.map((product) => (
                <tr key={product.productId}>
                  <td>
                    {form.status === 'partial' && canReview ? (
                      <label className="adm-check">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.productId)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((current) => {
                              const prev = Array.isArray(current.productIds)
                                ? current.productIds
                                : [];
                              return {
                                ...current,
                                productIds: checked
                                  ? [...new Set([...prev, product.productId])]
                                  : prev.filter(
                                      (id) => id !== product.productId,
                                    ),
                              };
                            });
                          }}
                        />
                        <span>{product.name}</span>
                      </label>
                    ) : (
                      <strong>{product.name}</strong>
                    )}
                  </td>
                  <td>
                    {product.quantity} · {product.unit}
                  </td>
                  {item.status === 'partial' && (
                    <td>
                      <Badge
                        value={
                          approvedIds.includes(product.productId)
                            ? 'approved'
                            : 'rejected'
                        }
                      >
                        {approvedIds.includes(product.productId)
                          ? 'Được duyệt'
                          : 'Không duyệt'}
                      </Badge>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          )}
          {canReview ? (
            <>
              <Field label="Kết quả kiểm duyệt" required>
                <select
                  name="status"
                  value={form.status === 'pending' ? '' : form.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setForm((f) => ({
                      ...f,
                      status: nextStatus,
                      productIds:
                        nextStatus === 'partial'
                          ? Array.isArray(f.productIds)
                            ? f.productIds
                            : []
                          : f.productIds,
                    }));
                  }}
                  required
                >
                  <option value="">Chọn kết quả</option>
                  <option value="approved">Duyệt toàn bộ đơn thuốc</option>
                  {rxItems.length > 1 && (
                    <option value="partial">Duyệt một phần</option>
                  )}
                  <option value="rejected">Từ chối đơn thuốc</option>
                </select>
              </Field>
              {form.status === 'partial' && (
                <div
                  className={`adm-inline-note ${partialInvalid ? 'is-warn' : 'is-ok'}`}
                >
                  Đã chọn {selectedIds.length} / {rxItems.length} thuốc kê đơn.
                  Khi duyệt một phần, cần chọn ít nhất 1 và ít hơn toàn bộ danh
                  sách thuốc kê đơn.
                </div>
              )}
              <div className="adm-quick-notes">
                <span>Mẫu ghi chú GPP:</span>
                {RX_QUICK_NOTES.map(([labelTxt, noteTxt]) => (
                  <button
                    key={labelTxt}
                    type="button"
                    className="adm-quick-chip"
                    onClick={() => setForm((f) => ({ ...f, note: noteTxt }))}
                  >
                    {labelTxt}
                  </button>
                ))}
              </div>
              {renderFields(
                [
                  [
                    'note',
                    'Ghi chú / lý do từ chối (tối thiểu 5 ký tự nếu từ chối hoặc duyệt một phần)',
                    'textarea',
                    ['rejected', 'partial'].includes(form.status),
                  ],
                ],
                form,
                change,
              )}
            </>
          ) : (
            <div className="adm-info-banner compact">
              <ClipboardCheck size={18} />
              <p>
                {item.reviewerName
                  ? `Người duyệt: ${item.reviewerName} (${dateTime(item.reviewedAt)}). `
                  : ''}
                {item.note ||
                  item.reviewNote ||
                  (item.status === 'pending'
                    ? 'Đơn hàng đã rời bước duyệt đơn thuốc.'
                    : 'Đơn thuốc đã được kiểm duyệt.')}
              </p>
            </div>
          )}
        </div>
        {canReview ? (
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={close}>
              Đóng
            </button>
            <button
              className="adm-btn primary"
              disabled={
                saving ||
                partialInvalid ||
                !form.status ||
                form.status === 'pending'
              }
              type="submit"
            >
              {saving ? (
                <LoaderCircle className="adm-spin" size={16} />
              ) : (
                <Check size={16} />
              )}{' '}
              Lưu kết quả kiểm duyệt
            </button>
          </div>
        ) : (
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={close}>
              Đóng
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}

function AuditDetailModal({ item, close }) {
  let formattedDetail = String(item.detail || '');
  try {
    if (
      formattedDetail.trim().startsWith('{') ||
      formattedDetail.trim().startsWith('[')
    ) {
      formattedDetail = JSON.stringify(JSON.parse(formattedDetail), null, 2);
    }
  } catch {
    // Keep original string.
  }

  return (
    <Modal title="Chi tiết nhật ký hệ thống" onClose={close}>
      <div className="adm-modal-body">
        <div className="adm-audit-meta">
          <div>
            <span>Hành động</span>
            <strong>{AUDIT_LABELS[item.action] || item.action}</strong>
            <small>
              <code>{item.action}</code>
            </small>
          </div>
          <div>
            <span>Thời gian</span>
            <strong>{dateTime(item.createdAt)}</strong>
          </div>
          <div>
            <span>Người thực hiện</span>
            <strong>
              {item.userName || item.actorName || 'Hệ thống'}
              {item.userId ? ` (#${item.userId})` : ''}
            </strong>
          </div>
          <div>
            <span>Đối tượng</span>
            <strong>
              {ENTITY_LABELS[item.entity] || item.entity || 'Hệ thống'}
              {item.entityId ? ` #${item.entityId}` : ''}
            </strong>
          </div>
        </div>
        <div className="adm-audit-summary">
          <span>Tóm tắt:</span> {formatAuditDetail(item.detail)}
        </div>
        <pre className="adm-audit-json">{formattedDetail || '—'}</pre>
      </div>
      <div className="adm-modal-footer">
        <button type="button" className="adm-btn" onClick={close}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}

export default function AdminModals({ c, user, config }) {
  if (!c.modal) return null;
  const { type, data: item } = c.modal;
  const edit = !!item.id;
  const { form, setForm, change, saving, setSaving, close, submit } = c;

  if (type === 'delete') {
    return (
      <Modal title="Xác nhận ngừng hoạt động / ẩn dữ liệu" onClose={close}>
        <form
          onSubmit={(e) =>
            submit(e, `/admin/${item.resource}/${item.id}`, 'DELETE')
          }
        >
          <div className="adm-modal-body">
            <div className="adm-info-banner danger">
              <AlertTriangle size={22} />
              <p>
                Bạn muốn ngừng hoạt động / ẩn{' '}
                <strong>
                  {item.name ||
                    item.title ||
                    item.code ||
                    `bản ghi #${item.id}`}
                </strong>
                ? Dữ liệu lịch sử giao dịch vẫn được bảo toàn và bạn có thể
                kích hoạt lại bất cứ lúc nào.
              </p>
            </div>
          </div>
          <ModalFooter
            close={close}
            saving={saving}
            saveLabel="Xác nhận ngừng"
          />
        </form>
      </Modal>
    );
  }

  if (type === 'product') {
    return (
      <ProductModal
        item={item}
        form={form}
        change={change}
        categories={c.categories}
        manufacturers={c.manufacturers}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'catalog') {
    return (
      <Modal
        title={`${edit ? 'Chỉnh sửa' : 'Thêm'} ${c.tab === 'categories' ? 'danh mục' : c.tab === 'suppliers' ? 'nhà cung cấp' : 'nhà sản xuất'}`}
        onClose={close}
      >
        <form
          onSubmit={(e) =>
            submit(
              e,
              `/admin/${c.tab}${edit ? `/${item.id}` : ''}`,
              edit ? 'PATCH' : 'POST',
            )
          }
        >
          <div className="adm-modal-body adm-form-grid">
            {renderFields(
              [
                ['name', 'Tên', 'text', true, { wide: true }],
                ...(c.tab === 'categories'
                  ? [
                      ['slug', 'Mã danh mục'],
                      [
                        'description',
                        'Mô tả',
                        'textarea',
                        false,
                        { wide: true },
                      ],
                    ]
                  : c.tab === 'suppliers'
                    ? [
                        ['phone', 'Số điện thoại'],
                        ['email', 'Email', 'email'],
                        ['address', 'Địa chỉ', 'text', false, { wide: true }],
                      ]
                    : [['country', 'Quốc gia']]),
              ],
              form,
              change,
            )}
            <CheckField
              name="active"
              value={form.active}
              onChange={change}
              label="Đang hoạt động"
            />
          </div>
          <ModalFooter close={close} saving={saving} />
        </form>
      </Modal>
    );
  }

  if (type === 'promotion') {
    return (
      <PromotionModal
        item={item}
        form={form}
        setForm={setForm}
        change={change}
        products={c.products}
        combos={c.combos}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'combo') {
    return (
      <ComboModal
        item={item}
        form={form}
        setForm={setForm}
        change={change}
        products={c.products}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'receipt') {
    return (
      <ReceiptModal
        form={form}
        setForm={setForm}
        change={change}
        products={c.products}
        suppliers={c.suppliers}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'adjustment') {
    return (
      <AdjustmentModal
        item={item}
        form={form}
        change={change}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'invite') {
    return (
      <Modal title="Thêm nhân viên" onClose={close}>
        <form onSubmit={c.submitInvite}>
          <div className="adm-modal-body">
            {renderFields(
              [
                ['name', 'Họ tên', 'text', true],
                ['email', 'Email nhận mã kích hoạt', 'email', true],
                ['phone', 'Số điện thoại', 'tel', false],
              ],
              form,
              change,
            )}
            <Field label="Chức danh" required>
              <select
                name="jobTitle"
                value={form.jobTitle}
                onChange={change}
                required
              >
                {['pharmacist', 'sales', 'warehouse'].map((title) => (
                  <option key={title} value={title}>
                    {adminLabel(title)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <ModalFooter close={close} saving={saving} saveLabel="Tạo tài khoản" />
        </form>
      </Modal>
    );
  }

  if (type === 'invited') {
    return (
      <Modal title="Đã tạo tài khoản nhân viên" onClose={close}>
        <div className="adm-modal-body">
          <p>
            Nhân viên {item.user.name} cần nhập mã kích hoạt và đặt mật khẩu để
            đăng nhập.
          </p>
          {item.demoCode ? (
            <p>
              Mã kích hoạt demo <strong>{item.demoCode}</strong>
            </p>
          ) : (
            <p>Đã gửi mã đến {item.user.email}.</p>
          )}
          <a
            className="adm-btn"
            href={`/verify?email=${encodeURIComponent(item.user.email)}&invite=1`}
            target="_blank"
            rel="noreferrer"
          >
            Mở trang kích hoạt <ArrowUpRight size={15} />
          </a>
        </div>
      </Modal>
    );
  }

  if (type === 'user') {
    return (
      <UserPermissionsModal
        item={item}
        user={user}
        form={form}
        setForm={setForm}
        change={change}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'rule') {
    return (
      <Modal title="Chỉnh sửa quy tắc an toàn" onClose={close}>
        <form
          onSubmit={(e) =>
            submit(e, `/admin/safety-rules/${item.id}`, 'PATCH', {
              ...form,
              keywords: String(form.keywords || '')
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
        >
          <div className="adm-modal-body">
            {renderFields(
              [
                ['name', 'Tên quy tắc', 'text', true],
                [
                  'keywords',
                  'Từ khóa cảnh báo, phân cách bằng dấu phẩy',
                  'textarea',
                  true,
                ],
                [
                  'pattern',
                  'Nhóm quy tắc / biểu thức nhận diện',
                  'text',
                  false,
                ],
                ['response', 'Nội dung phản hồi an toàn', 'textarea', true],
              ],
              form,
              change,
            )}
            <CheckField
              label="Kích hoạt quy tắc"
              name="active"
              value={form.active}
              onChange={change}
            />
          </div>
          <ModalFooter close={close} saving={saving} saveLabel="Lưu quy tắc" />
        </form>
      </Modal>
    );
  }

  if (type === 'knowledgeReview') {
    return (
      <Modal title="Rà soát tri thức" onClose={close}>
        <form
          onSubmit={(e) =>
            submit(e, `/admin/knowledge/${item.id}/review`, 'POST', {})
          }
        >
          <div className="adm-modal-body">
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            <p>Nguồn tham khảo · {item.source || 'Chưa bổ sung'}</p>
            <CheckField
              name="checkedSource"
              label="Đã đối chiếu nguồn và nội dung"
              value={form.checkedSource}
              onChange={change}
            />
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={close}>
              Đóng
            </button>
            <button
              type="submit"
              className="adm-btn primary"
              disabled={saving || !item.source || !form.checkedSource}
            >
              Duyệt tri thức
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  if (type === 'knowledge') {
    return (
      <Modal
        title={edit ? 'Chỉnh sửa tri thức' : 'Thêm tri thức chatbot'}
        onClose={close}
      >
        <form
          onSubmit={(e) =>
            submit(
              e,
              `/admin/knowledge${edit ? `/${item.id}` : ''}`,
              edit ? 'PATCH' : 'POST',
            )
          }
        >
          <div className="adm-modal-body">
            {renderFields(
              [
                ['title', 'Tiêu đề', 'text', true],
                ['source', 'Nguồn tham khảo', 'text', true],
                ['keywords', 'Từ khóa, phân cách bằng dấu phẩy', 'text', true],
                ['content', 'Nội dung trả lời', 'textarea', true],
              ],
              form,
              change,
            )}
            <CheckField
              label="Cho phép chatbot sử dụng"
              name="active"
              value={form.active}
              onChange={change}
            />
          </div>
          <ModalFooter close={close} saving={saving} />
        </form>
      </Modal>
    );
  }

  if (type === 'support') {
    return (
      <Modal title="Tư vấn khách hàng" onClose={close} wide>
        <SupportChat
          key={item.id}
          item={item}
          notify={c.notify}
          onChanged={() => c.load(true)}
        />
      </Modal>
    );
  }

  if (type === 'prescription') {
    return (
      <PrescriptionReviewModal
        item={item}
        form={form}
        setForm={setForm}
        change={change}
        orderDetail={c.orderDetail}
        submit={submit}
        close={close}
        saving={saving}
      />
    );
  }

  if (type === 'auditDetail') {
    return <AuditDetailModal item={item} close={close} />;
  }

  if (type === 'backup') {
    return (
      <Modal title="Tạo bản sao lưu mã hóa" onClose={close}>
        <form onSubmit={c.submitBackup}>
          <div className="adm-modal-body">
            <p>
              Dùng cùng cụm mật khẩu khi phục hồi. Lưu thư mục tệp đơn thuốc
              riêng trên máy chủ.
            </p>
            {renderFields(
              [
                [
                  'passphrase',
                  'Cụm mật khẩu sao lưu',
                  'password',
                  true,
                  {
                    minLength: 12,
                    maxLength: 256,
                    autoComplete: 'new-password',
                  },
                ],
              ],
              form,
              change,
            )}
          </div>
          <ModalFooter
            close={close}
            saving={saving}
            saveLabel="Tải bản sao lưu"
          />
        </form>
      </Modal>
    );
  }

  if (type === 'restore') {
    return (
      <Modal title="Phục hồi dữ liệu từ bản sao lưu" onClose={close}>
        <form onSubmit={c.submitRestore}>
          <div className="adm-modal-body">
            <div className="adm-info-banner danger">
              <AlertTriangle size={22} />
              <p>
                Thao tác này thay thế cơ sở dữ liệu hiện tại bằng bản sao lưu.
                Phiên đăng nhập sẽ kết thúc. Tệp đơn thuốc cần được sao lưu và
                phục hồi riêng tại máy chủ.
              </p>
            </div>
            <label className="adm-field">
              <span>Bản sao lưu JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                required
                onChange={c.handleRestoreFileChange}
              />
            </label>
            {renderFields(
              [
                [
                  'passphrase',
                  'Cụm mật khẩu sao lưu',
                  'password',
                  true,
                  { minLength: 12, maxLength: 256, autoComplete: 'off' },
                ],
              ],
              form,
              change,
            )}
            <Field
              label="Nhập RESTORE_ANTAM để xác nhận"
              name="confirm"
              value={form.confirm}
              onChange={change}
              pattern="RESTORE_ANTAM"
              required
            />
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={close}>
              Đóng
            </button>
            <button
              type="submit"
              className="adm-btn primary"
              disabled={
                saving ||
                !form.backup ||
                !form.passphrase ||
                form.confirm !== 'RESTORE_ANTAM'
              }
            >
              {saving ? (
                <LoaderCircle className="adm-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Phục hồi dữ liệu
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  if (type === 'returnGoods') {
    const next = RETURN_GOODS_NEXT[item.status] || [];
    return (
      <Modal title={`Hàng trả về · ${item.orderCode}`} onClose={close}>
        <form
          onSubmit={(e) =>
            submit(e, `/admin/return-goods/${item.id}`, 'PATCH', {
              status: form.nextStatus,
              carrier: form.carrier,
              trackingCode: form.trackingCode,
              note: form.note,
              sealed: !!form.sealed,
            })
          }
        >
          <div className="adm-modal-body">
            <div className="adm-message-preview">
              <strong>
                {item.orderCode} · {item.userName}
                {item.userPhone ? ` · ${item.userPhone}` : ''}
              </strong>
              <p>Lý do trả hàng: {item.reason}</p>
              <Badge value={`return_${item.status}`} />
              <ul className="adm-return-items">
                {(item.items || []).map((product) => (
                  <li key={product.productId}>
                    {product.name} × {product.quantity} {product.unit}
                  </li>
                ))}
              </ul>
              <div className="adm-return-timeline">
                {item.trackingCode && (
                  <span>
                    Vận đơn: {item.trackingCode}
                    {item.carrier ? ` (${item.carrier})` : ''}
                  </span>
                )}
                {item.receivedAt && (
                  <span>Nhận hàng: {dateTime(item.receivedAt)}</span>
                )}
                {item.inspectedAt && (
                  <span>
                    Kiểm hàng: {dateTime(item.inspectedAt)}
                    {item.handlerName ? ` · ${item.handlerName}` : ''}
                  </span>
                )}
                {item.note && <span>Ghi chú: {item.note}</span>}
              </div>
            </div>
            {next.length > 0 ? (
              <>
                <Field label="Cập nhật trạng thái" required>
                  <select
                    name="nextStatus"
                    value={form.nextStatus || ''}
                    onChange={change}
                    required
                  >
                    <option value="">Chọn bước tiếp theo</option>
                    {next.map((v) => (
                      <option key={v} value={v}>
                        {RETURN_GOODS_ACTION[v]}
                      </option>
                    ))}
                  </select>
                </Field>
                {form.nextStatus === 'in_transit' &&
                  renderFields(
                    [
                      ['carrier', 'Đơn vị vận chuyển'],
                      ['trackingCode', 'Mã vận đơn', 'text', true],
                    ],
                    form,
                    change,
                  )}
                {form.nextStatus === 'restocked' && (
                  <CheckField
                    label="Thuốc còn niêm phong và được bảo quản đúng"
                    name="sealed"
                    value={form.sealed}
                    onChange={change}
                  />
                )}
                {renderFields(
                  [
                    [
                      'note',
                      form.nextStatus === 'discarded'
                        ? 'Lý do loại bỏ'
                        : 'Ghi chú (không bắt buộc)',
                      'textarea',
                      form.nextStatus === 'discarded',
                    ],
                  ],
                  form,
                  change,
                )}
              </>
            ) : (
              <div className="adm-info-banner compact">
                <ClipboardCheck size={18} />
                <p>Hàng trả về đã xử lý xong, không thể thay đổi thêm.</p>
              </div>
            )}
          </div>
          {next.length > 0 ? (
            <ModalFooter close={close} saving={saving} saveLabel="Cập nhật" />
          ) : (
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
            </div>
          )}
        </form>
      </Modal>
    );
  }

  if (type === 'request') {
    const waitingGoods =
      item.type === 'return' &&
      ['awaiting', 'in_transit'].includes(item.returnGoodsStatus);
    const canRefundNow =
      item.status === 'approved' &&
      ['paid', 'refund_pending'].includes(item.paymentStatus) &&
      ['cancelled', 'returned'].includes(item.orderStatus) &&
      !item.refundAmount;

    return (
      <Modal
        title={`Xử lý yêu cầu ${adminLabel(item.type).toLowerCase()}`}
        onClose={close}
      >
        <form
          onSubmit={(e) => {
            if (item.status === 'approved')
              submit(e, `/admin/requests/${item.id}/refund`, 'POST', {
                amount: Number(form.amount) || item.total,
                confirmedCash: !!form.confirmedCash,
                confirmedTransfer: !!form.confirmedTransfer,
                refundReference: form.refundReference || '',
              });
            else
              submit(e, `/admin/requests/${item.id}`, 'PATCH', {
                status: form.status,
                reply: form.reply,
                restock: !!form.restock,
                sealed: !!form.sealed,
                storeFault: !!form.storeFault,
              });
          }}
        >
          <div className="adm-modal-body">
            <div className="adm-message-preview">
              <div className="adm-ord-req-head">
                <strong>
                  {item.orderCode} · {item.userName}
                </strong>
                <button
                  type="button"
                  className="adm-text-btn"
                  onClick={() =>
                    c.orderDetail({ id: item.orderId, code: item.orderCode })
                  }
                >
                  Xem đơn hàng <ArrowUpRight size={14} />
                </button>
              </div>
              <p>{item.reason}</p>
              <Badge value={item.status} />
              {item.returnGoodsStatus && (
                <Badge value={`return_${item.returnGoodsStatus}`} />
              )}
              {item.evidenceAvailable && (
                <a
                  className="adm-text-btn"
                  href={`/api/orders/${item.orderId}/requests/${item.id}/evidence`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem ảnh đổi trả <ExternalLink size={15} />
                </a>
              )}
            </div>
            {item.status === 'pending' ? (
              <>
                <Field label="Kết quả xử lý" required>
                  <select
                    name="status"
                    value={form.status === 'pending' ? '' : form.status}
                    onChange={change}
                    required
                  >
                    <option value="">Chọn kết quả</option>
                    <option value="approved">Chấp nhận yêu cầu</option>
                    <option value="rejected">Từ chối yêu cầu</option>
                  </select>
                </Field>
                {renderFields(
                  [
                    [
                      'reply',
                      'Phản hồi / lý do xử lý',
                      'textarea',
                      form.status === 'rejected',
                    ],
                  ],
                  form,
                  change,
                )}
                {item.type === 'return' && form.status === 'approved' && (
                  <>
                    <CheckField
                      label="Thuốc còn niêm phong và được bảo quản đúng"
                      name="sealed"
                      value={form.sealed}
                      onChange={change}
                    />
                    <CheckField
                      label="Chấp nhận đổi trả do lỗi từ nhà thuốc"
                      name="storeFault"
                      value={form.storeFault}
                      onChange={change}
                    />
                    <CheckField
                      label="Đã nhận và kiểm hàng, nhập lại kho ngay"
                      name="restock"
                      value={form.restock}
                      onChange={change}
                    />
                    <p className="field-help">
                      Nếu chưa nhận được hàng, để trống ô trên: yêu cầu sẽ được
                      theo dõi ở tab Hàng trả về cho đến khi kiểm hàng.
                    </p>
                  </>
                )}
              </>
            ) : waitingGoods && item.status === 'approved' ? (
              <div className="adm-info-banner compact">
                <AlertTriangle size={18} />
                <p>
                  Chờ nhận hàng trả về trước khi hoàn tiền. Cập nhật trạng thái
                  ở tab Hàng trả về khi nhà thuốc đã nhận hàng.
                </p>
              </div>
            ) : canRefundNow ? (
              <>
                <div className="adm-info-banner compact">
                  <AlertTriangle size={18} />
                  <p>
                    {item.paymentMethod === 'vnpay'
                      ? 'Hoàn tiền qua cổng VNPay Sandbox.'
                      : config?.demoMode
                        ? 'Ghi nhận hoàn tiền trong môi trường trình diễn.'
                        : 'Nhập số tiền đã hoàn cho khách hàng.'}
                  </p>
                </div>
                <Field
                  label={`Số tiền hoàn (tối đa ${money(item.total)})`}
                  name="amount"
                  type="number"
                  min="1"
                  max={item.total}
                  value={form.amount ?? item.total}
                  onChange={change}
                  required
                />
                {item.paymentMethod === 'cod' && !config?.demoMode && (
                  <CheckField
                    label="Đã hoàn tiền mặt cho khách"
                    name="confirmedCash"
                    value={form.confirmedCash}
                    onChange={change}
                  />
                )}
                {item.paymentMethod === 'bank_transfer' && (
                  <>
                    <Field
                      label="Mã giao dịch hoàn tiền"
                      name="refundReference"
                      value={form.refundReference || ''}
                      onChange={change}
                      minLength={6}
                      required
                    />
                    <CheckField
                      label="Đã hoàn tiền chuyển khoản cho khách"
                      name="confirmedTransfer"
                      value={form.confirmedTransfer}
                      onChange={change}
                    />
                  </>
                )}
              </>
            ) : (
              <div className="adm-info-banner compact">
                <ClipboardCheck size={18} />
                <p>
                  {item.reply || 'Yêu cầu đã được xử lý.'}
                  {item.refundAmount > 0
                    ? ` Đã hoàn ${money(item.refundAmount)}.`
                    : ''}
                </p>
              </div>
            )}
          </div>
          {item.status === 'pending' ? (
            <ModalFooter close={close} saving={saving} saveLabel="Lưu kết quả" />
          ) : waitingGoods && item.status === 'approved' ? (
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
            </div>
          ) : canRefundNow ? (
            <ModalFooter
              close={close}
              saving={saving}
              saveLabel="Xác nhận hoàn tiền"
            />
          ) : (
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
            </div>
          )}
        </form>
      </Modal>
    );
  }

  if (type === 'createOrder') {
    return (
      <Modal title="Tạo đơn hàng hộ khách" onClose={close} wide>
        <AdminCreateOrderModal
          config={config}
          onClose={close}
          notify={c.notify}
          onCreated={async (created) => {
            await c.load(true);
            c.open('order', created);
          }}
        />
      </Modal>
    );
  }

  if (type === 'order') {
    return (
      <Modal title={`Đơn hàng ${item.code}`} onClose={close} wide>
        <AdminOrderDetailModal
          item={item}
          form={form}
          setForm={setForm}
          change={change}
          saving={saving}
          setSaving={setSaving}
          onClose={close}
          notify={c.notify}
          hasPermission={c.hasPermission}
          onOpenPrescription={c.openPrescriptionById}
          onOpenRequest={(r) => c.open('request', r)}
          onOrderUpdated={async (updated) => {
            c.setModal({ type: 'order', data: updated });
            setForm((prev) => ({
              ...prev,
              nextStatus: '',
              statusNote: '',
              collected: false,
            }));
            await c.load(true);
          }}
          onBankReconcile={(event) =>
            submit(event, `/admin/orders/${item.id}/bank-transfer`, 'POST', {
              amount: form.bankAmount,
              reference: form.bankReference,
              confirmed: !!form.bankConfirmed,
            })
          }
          onSubmitStatus={(e) =>
            submit(e, `/admin/orders/${item.id}/status`, 'PATCH', {
              status: form.nextStatus,
              collected: !!form.collected,
              note: form.statusNote,
              shippingCarrier: form.shippingCarrier,
              trackingCode: form.trackingCode,
            })
          }
        />
      </Modal>
    );
  }

  return null;
}
