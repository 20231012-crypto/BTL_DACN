import { randomBytes, createHash } from 'node:crypto';
import { camel, now, normalize, today } from '../repositories/database.js';
import { searchScore } from '../../shared/search.js';
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
export async function getSettings(d) {
  return Object.fromEntries(
    (await d.all('SELECT * FROM settings')).map((x) => [
      x.key,
      JSON.parse(x.value),
    ]),
  );
}
export async function audit(d, userId, action, entity, entityId, detail = '') {
  await d.insert('nhat_ky_hoat_dong', {
    user_id: userId || null,
    action,
    entity,
    entity_id: String(entityId || ''),
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    created_at: now(),
  });
}
export async function publicUser(d, id) {
  const u = await d.one('SELECT * FROM nguoi_dung WHERE id=?', id);
  if (!u) return null;
  const roles = (
    await d.all(
      'SELECT v.name FROM vai_tro v JOIN nguoi_dung_vai_tro uv ON uv.role_id=v.id WHERE uv.user_id=?',
      id,
    )
  ).map((x) => x.name);
  const granted = new Set(
    (
      await d.all(
        'SELECT DISTINCT q.code FROM quyen q JOIN quyen_vai_tro qv ON qv.permission_id=q.id JOIN nguoi_dung_vai_tro uv ON uv.role_id=qv.role_id WHERE uv.user_id=?',
        id,
      )
    ).map((x) => x.code),
  );
  for (const p of await d.all(
    'SELECT q.code,p.allowed FROM phan_quyen p JOIN quyen q ON q.id=p.permission_id WHERE p.user_id=?',
    id,
  )) {
    if (p.allowed) granted.add(p.code);
    else granted.delete(p.code);
  }
  const title =
    (await d.one('SELECT job_title FROM nhan_vien WHERE id=?', id))
      ?.job_title || null;
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
const productSql = `SELECT t.*,c.name category_name,c.slug category_slug,c.active category_active,n.name manufacturer,
  COALESCE((SELECT SUM(b.quantity-b.reserved) FROM lo_thuoc b WHERE b.product_id=t.id AND b.expires_at>?),0) stock,
  COALESCE((SELECT AVG(r.rating) FROM danh_gia r WHERE r.product_id=t.id),0) rating,
  (SELECT COUNT(*) FROM danh_gia r WHERE r.product_id=t.id) review_count
  FROM thuoc t JOIN danh_muc c ON c.id=t.category_id LEFT JOIN nha_san_xuat n ON n.id=t.manufacturer_id`;
const activeProducts = 't.active=1 AND c.active=1';
function productView(row) {
  const { manufacturer_id, stock, rating, review_count, ...p } = row;
  return {
    ...camel(p),
    manufacturerId: manufacturer_id,
    prescriptionRequired: !!p.prescription_required,
    featured: !!p.featured,
    active: !!p.active,
    stock: Number(stock),
    rating: Number(Number(rating).toFixed(1)),
    reviewCount: Number(review_count),
  };
}
export async function getProduct(d, id, includeHidden = false) {
  const productId = Number(id);
  if (!Number.isSafeInteger(productId) || productId < 1) return null;
  const row = await d.one(
    `${productSql} WHERE t.id=? ${includeHidden ? '' : `AND ${activeProducts}`}`,
    today(),
    productId,
  );
  return row ? productView(row) : null;
}
export async function productList(d, query = {}, hidden = false) {
  let list = (
    await d.all(
      `${productSql} ${hidden ? '' : `WHERE ${activeProducts}`} ORDER BY t.featured DESC,t.id`,
      today(),
    )
  ).map(productView);
  const search = normalize(query.search);
  if (search) {
    const ranked = list.map((product) => ({ product, score: Math.max(
      searchScore(`${product.name} ${product.ingredient} ${product.manufacturer}`, search),
      searchScore(product.description, search) * 0.5,
    ) })).filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
    list = ranked.map((row) => row.product);
  }
  if (query.category)
    list = list.filter(
      (p) =>
        String(p.categoryId) === String(query.category) ||
        p.categorySlug === query.category,
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
export async function cartRows(d, userId) {
  const cart = await d.one('SELECT id FROM gio_hang WHERE user_id=?', userId);
  if (!cart) return [];
  return await Promise.all(
    (
      await d.all(
        'SELECT * FROM chi_tiet_gio_hang WHERE cart_id=? ORDER BY id',
        cart.id,
      )
    ).map(async (x) => ({
      id: x.id,
      productId: x.product_id,
      quantity: x.quantity,
      product: await getProduct(d, x.product_id, true),
    })),
  );
}
export function requestView(row) {
  const { evidence_storage_name, evidence_mime_type, ...data } = row;
  return { ...camel(data), evidenceAvailable: Boolean(evidence_storage_name) };
}
export async function orderView(d, id) {
  const o = await d.one('SELECT * FROM don_hang WHERE id=?', Number(id));
  if (!o) return null;
  const p = await d.one(
    'SELECT id,status,note,approved_product_ids FROM don_thuoc WHERE order_id=?',
    o.id,
  );
  const user = await d.one(
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
    items: (
      await d.all(
        `SELECT i.*, EXISTS(SELECT 1 FROM danh_gia r
      WHERE r.order_id=i.order_id AND r.product_id=i.product_id AND r.user_id=?) reviewed
      FROM chi_tiet_don_hang i WHERE i.order_id=?`,
        o.user_id,
        o.id,
      )
    ).map(camel),
    prescriptionId: p?.id || null,
    prescriptionStatus: p?.status || null,
    prescriptionNote: p?.note || '',
    prescriptionApprovedProductIds: p?.approved_product_ids
      ? JSON.parse(p.approved_product_ids)
      : [],
    requests: (
      await d.all(
        'SELECT r.*,g.status return_goods_status,g.carrier return_carrier,g.tracking_code return_tracking_code FROM yeu_cau_huy_hoan r LEFT JOIN hang_tra_ve g ON g.request_id=r.id WHERE r.order_id=? ORDER BY r.id DESC',
        o.id,
      )
    ).map(requestView),
    history: (
      await d.all(
        'SELECT * FROM order_status_history WHERE order_id=? ORDER BY id',
        o.id,
      )
    ).map(camel),
    transactions: (
      await d.all(
        'SELECT * FROM giao_dich_thanh_toan WHERE order_id=? ORDER BY id',
        o.id,
      )
    ).map(camel),
  };
}
