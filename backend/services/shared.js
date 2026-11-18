import { randomBytes, createHash } from 'node:crypto';
import { camel, now, normalize, today } from '../repositories/database.js';
export const hash = (value) =>
  createHash('sha256').update(String(value)).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export const assert = (condition, status, message) => {
  if (!condition) fail(status, message);
};
export const text = (value, max = 1000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
export const positiveInt = (value, max = 1000000) =>
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0 &&
  Number(value) <= max
    ? Number(value)
    : null;
export function getSettings(d) {
  return Object.fromEntries(
    d.all('SELECT * FROM settings').map((x) => [x.key, JSON.parse(x.value)]),
  );
}
export function audit(d, userId, action, entity, entityId, detail = '') {
  d.insert('nhat_ky_hoat_dong', {
    user_id: userId || null,
    action,
    entity,
    entity_id: String(entityId || ''),
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    created_at: now(),
  });
}
export function publicUser(d, id) {
  const u = d.one('SELECT * FROM nguoi_dung WHERE id=?', id);
  if (!u) return null;
  const roles = d
    .all(
      'SELECT v.name FROM vai_tro v JOIN nguoi_dung_vai_tro uv ON uv.role_id=v.id WHERE uv.user_id=?',
      id,
    )
    .map((x) => x.name);
  const granted = new Set(
    d
      .all(
        'SELECT DISTINCT q.code FROM quyen q JOIN quyen_vai_tro qv ON qv.permission_id=q.id JOIN nguoi_dung_vai_tro uv ON uv.role_id=qv.role_id WHERE uv.user_id=?',
        id,
      )
      .map((x) => x.code),
  );
  for (const p of d.all(
    'SELECT q.code,p.allowed FROM phan_quyen p JOIN quyen q ON q.id=p.permission_id WHERE p.user_id=?',
    id,
  )) {
    if (p.allowed) granted.add(p.code);
    else granted.delete(p.code);
  }
  const title =
    d.one('SELECT job_title FROM nhan_vien WHERE id=?', id)?.job_title || null;
  if (title !== 'pharmacist') granted.delete('prescriptions');
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    active: !!u.active,
    verified: !!u.verified,
    role: roles.includes('admin')
      ? 'admin'
      : roles.includes('staff')
        ? 'staff'
        : 'customer',
    roles,
    jobTitle: title,
    permissions: [...granted],
    createdAt: u.created_at,
  };
}
export function getProduct(d, id, includeHidden = false) {
  const row = d.one(
    `SELECT t.*,c.name category_name,c.active category_active,n.name manufacturer FROM thuoc t JOIN danh_muc c ON c.id=t.category_id LEFT JOIN nha_san_xuat n ON n.id=t.manufacturer_id WHERE t.id=? ${includeHidden ? '' : 'AND t.active=1 AND c.active=1'}`,
    Number(id),
  );
  if (!row) return null;
  const stock = d.one(
    'SELECT COALESCE(SUM(quantity-reserved),0) stock FROM lo_thuoc WHERE product_id=? AND expires_at>?',
    row.id,
    today(),
  ).stock;
  const rating = d.one(
    'SELECT COALESCE(AVG(rating),0) rating,COUNT(*) review_count FROM danh_gia WHERE product_id=?',
    row.id,
  );
  const { manufacturer_id, ...p } = row;
  return {
    ...camel(p),
    manufacturerId: manufacturer_id,
    prescriptionRequired: !!p.prescription_required,
    featured: !!p.featured,
    active: !!p.active,
    stock: Number(stock),
    rating: Number(rating.rating.toFixed(1)),
    reviewCount: rating.review_count,
  };
}
export function productList(d, query = {}, hidden = false) {
  let list = d
    .all('SELECT id FROM thuoc ORDER BY featured DESC,id')
    .map((x) => getProduct(d, x.id, hidden))
    .filter(Boolean);
  const search = normalize(query.search);
  if (search)
    list = list.filter((p) =>
      normalize(
        `${p.name} ${p.ingredient} ${p.description} ${p.manufacturer}`,
      ).includes(search),
    );
  if (query.category)
    list = list.filter(
      (p) =>
        String(p.categoryId) === String(query.category) ||
        d.one('SELECT slug FROM danh_muc WHERE id=?', p.categoryId)?.slug ===
          query.category,
    );
  if (query.manufacturer)
    list = list.filter(
      (p) =>
        String(p.manufacturerId) === String(query.manufacturer) ||
        normalize(p.manufacturer).includes(normalize(query.manufacturer)),
    );
  if (query.prescription === 'true' || query.prescription === '1')
    list = list.filter((p) => p.prescriptionRequired);
  if (query.prescription === 'false' || query.prescription === '0')
    list = list.filter((p) => !p.prescriptionRequired);
  if (query.minPrice)
    list = list.filter((p) => p.price >= Number(query.minPrice));
  if (query.maxPrice)
    list = list.filter((p) => p.price <= Number(query.maxPrice));
  if (query.inStock === 'true') list = list.filter((p) => p.stock > 0);
  if (['price_asc', 'price-asc', 'priceAsc'].includes(query.sort))
    list.sort((a, b) => a.price - b.price);
  if (['price_desc', 'price-desc', 'priceDesc'].includes(query.sort))
    list.sort((a, b) => b.price - a.price);
  if (query.sort === 'name')
    list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  if (query.sort === 'newest') list.sort((a, b) => b.id - a.id);
  return list;
}
export function cartRows(d, userId) {
  const cart = d.one('SELECT id FROM gio_hang WHERE user_id=?', userId);
  if (!cart) return [];
  return d
    .all('SELECT * FROM chi_tiet_gio_hang WHERE cart_id=? ORDER BY id', cart.id)
    .map((x) => ({
      id: x.id,
      productId: x.product_id,
      quantity: x.quantity,
      product: getProduct(d, x.product_id, true),
    }));
}
export function requestView(row) {
  const { evidence_storage_name, evidence_mime_type, ...data } = row;
  return { ...camel(data), evidenceAvailable: Boolean(evidence_storage_name) };
}
export function orderView(d, id) {
  const o = d.one('SELECT * FROM don_hang WHERE id=?', Number(id));
  if (!o) return null;
  const p = d.one(
    'SELECT id,status,note,approved_product_ids FROM don_thuoc WHERE order_id=?',
    o.id,
  );
  const user = d.one(
    'SELECT name,email,phone FROM nguoi_dung WHERE id=?',
    o.user_id,
  );
  return {
    ...camel(o),
    address: JSON.parse(o.address_json),
    addressJson: undefined,
    userName: user?.name,
    customerName: user?.name,
    email: user?.email,
    phone: user?.phone,
    items: d
      .all(
        `SELECT i.*, EXISTS(SELECT 1 FROM danh_gia r
      WHERE r.order_id=i.order_id AND r.product_id=i.product_id AND r.user_id=?) reviewed
      FROM chi_tiet_don_hang i WHERE i.order_id=?`,
        o.user_id,
        o.id,
      )
      .map(camel),
    prescriptionId: p?.id || null,
    prescriptionStatus: p?.status || null,
    prescriptionNote: p?.note || '',
    prescriptionApprovedProductIds: p?.approved_product_ids
      ? JSON.parse(p.approved_product_ids)
      : [],
    requests: d
      .all(
        'SELECT * FROM yeu_cau_huy_hoan WHERE order_id=? ORDER BY id DESC',
        o.id,
      )
      .map(requestView),
    history: d
      .all(
        'SELECT * FROM order_status_history WHERE order_id=? ORDER BY id',
        o.id,
      )
      .map(camel),
    transactions: d
      .all(
        'SELECT * FROM giao_dich_thanh_toan WHERE order_id=? ORDER BY id',
        o.id,
      )
      .map(camel),
  };
}
