/**
 * Admin Products Management View.
 */
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Layers,
  Pencil,
  Pill,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { count, list, money, searchScore } from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, KpiGrid, Table } from './adminUi.jsx';

export default function AdminProductsView({
  rows,
  categories,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  lowStockThreshold = 15,
  canManageInventory,
  onOpenProduct,
  onOpenReceipt,
  onOpenDelete,
  onToggleActive,
}) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, stockFilter, activeFilter, sortBy, setPage]);

  const all = list(rows);
  const catNameMap = new Map(list(categories).map((c) => [c.id, c.name]));
  const threshold = Number(lowStockThreshold) || 15;
  const activeCount = all.filter((p) => p.active !== false).length;
  const hiddenCount = all.filter((p) => p.active === false).length;
  const rxCount = all.filter((p) => p.prescriptionRequired).length;
  const outCount = all.filter(
    (p) => p.active !== false && Number(p.stock || 0) === 0,
  ).length;
  const lowOrOutCount = all.filter(
    (p) => p.active !== false && Number(p.stock || 0) < threshold,
  ).length;

  const kpiCards = [
    {
      key: 'all',
      label: 'Tổng sản phẩm',
      value: count(all.length),
      sub: `${count(list(categories).length)} danh mục`,
      Icon: Package,
      tone: 'tone-0',
      active: !filter && !stockFilter && !activeFilter && !categoryFilter,
      onClick: () => {
        setFilter('');
        setCategoryFilter('');
        setStockFilter('');
        setActiveFilter('');
      },
    },
    {
      key: 'active',
      label: 'Đang hiển thị',
      value: count(activeCount),
      sub: 'Khách có thể tìm & mua',
      Icon: CheckCircle2,
      tone: 'tone-1',
      active: activeFilter === 'active',
      onClick: () =>
        setActiveFilter(activeFilter === 'active' ? '' : 'active'),
    },
    {
      key: 'rx',
      label: 'Thuốc kê đơn',
      value: count(rxCount),
      sub: `${count(all.length - rxCount)} thuốc không kê đơn`,
      Icon: Pill,
      tone: 'tone-3',
      active: filter === 'rx',
      onClick: () => setFilter(filter === 'rx' ? '' : 'rx'),
    },
    {
      key: 'low',
      label: 'Hết / Sắp hết hàng',
      value: count(lowOrOutCount),
      sub: `${count(outCount)} hết hàng · ngưỡng < ${count(threshold)}`,
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: stockFilter === 'low_or_out',
      onClick: () =>
        setStockFilter(stockFilter === 'low_or_out' ? '' : 'low_or_out'),
    },
    {
      key: 'inactive',
      label: 'Đang tạm ẩn',
      value: count(hiddenCount),
      sub: 'Đã ẩn khỏi cửa hàng',
      Icon: Layers,
      tone: 'tone-0',
      active: activeFilter === 'inactive',
      onClick: () =>
        setActiveFilter(activeFilter === 'inactive' ? '' : 'inactive'),
    },
  ];

  let filteredRows = all.filter((p) => {
    if (filter === 'rx' && !p.prescriptionRequired) return false;
    if (filter === 'otc' && p.prescriptionRequired) return false;
    if (filter === 'active' && p.active === false) return false;
    if (filter === 'inactive' && p.active !== false) return false;
    if (categoryFilter && String(p.categoryId) !== String(categoryFilter))
      return false;
    if (activeFilter === 'active' && p.active === false) return false;
    if (activeFilter === 'inactive' && p.active !== false) return false;
    const stock = Number(p.stock || 0);
    if (stockFilter === 'in_stock' && stock < threshold) return false;
    if (stockFilter === 'low' && !(stock > 0 && stock < threshold))
      return false;
    if (stockFilter === 'out' && stock !== 0) return false;
    if (stockFilter === 'low_or_out' && stock >= threshold) return false;
    if (!query) return true;
    const hay = [
      p.name,
      p.slug,
      p.ingredient,
      p.manufacturer,
      p.categoryName || catNameMap.get(p.categoryId),
      `SP-${p.id}`,
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  if (sortBy !== 'default') {
    filteredRows = [...filteredRows].sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'name_asc')
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      return 0;
    });
  }

  const hasFilters = Boolean(
    query ||
      filter ||
      categoryFilter ||
      stockFilter ||
      activeFilter ||
      sortBy !== 'default',
  );
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = filteredRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <>
      <KpiGrid cards={kpiCards} />
      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên thuốc, hoạt chất, mã slug, nhà sản xuất..."
              aria-label="Tìm sản phẩm"
            />
          </div>
          <div className="adm-toolbar-right">
            <select
              className="adm-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Lọc danh mục"
            >
              <option value="">Tất cả danh mục</option>
              {list(categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="adm-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc phân loại"
            >
              <option value="">Tất cả phân loại</option>
              <option value="otc">Không kê đơn</option>
              <option value="rx">Thuốc kê đơn</option>
            </select>
            <select
              className="adm-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              aria-label="Lọc tồn kho"
            >
              <option value="">Mọi mức tồn</option>
              <option value="in_stock">Còn hàng (≥ {threshold})</option>
              <option value="low">Sắp hết hàng</option>
              <option value="out">Hết hàng (0)</option>
            </select>
            <select
              className="adm-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp"
            >
              <option value="default">Mặc định (Nổi bật)</option>
              <option value="newest">Mới nhất</option>
              <option value="stock_asc">Tồn kho thấp trước</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name_asc">Tên A–Z</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setFilter('');
                  setCategoryFilter('');
                  setStockFilter('');
                  setActiveFilter('');
                  setSortBy('default');
                }}
              >
                <X size={15} />
                Đặt lại
              </button>
            )}
            <button
              type="button"
              className="adm-btn primary"
              onClick={() =>
                onOpenProduct({
                  unit: 'Hộp',
                  price: '',
                  oldPrice: '',
                  categoryId: list(categories)[0]?.id || '',
                  prescriptionRequired: false,
                  featured: false,
                  active: true,
                })
              }
            >
              <Plus size={17} />
              Thêm sản phẩm
            </button>
          </div>
        </div>

        <Table
          columns={[
            'Sản phẩm',
            'Danh mục & NSX',
            'Giá bán',
            'Tồn khả dụng',
            'Phân loại',
            'Trạng thái',
            '',
          ]}
          rows={visible}
          empty="Không tìm thấy sản phẩm nào khớp bộ lọc"
        >
          {visible.map((p) => {
            const stock = Number(p.stock || 0);
            const hasDiscount = p.oldPrice && Number(p.oldPrice) > Number(p.price);
            const discountPct = hasDiscount
              ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
              : 0;
            const stockState =
              stock === 0
                ? 'out_of_stock'
                : stock < threshold
                  ? 'low_stock'
                  : 'in_stock';
            return (
              <tr key={p.id}>
                <td className="adm-cell-wrap">
                  <div className="adm-product-cell">
                    <div className="adm-product-thumb">
                      {p.image?.startsWith('/') || p.image?.startsWith('http') ? (
                        <img
                          src={p.image}
                          alt=""
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Pill size={20} />
                      )}
                    </div>
                    <div>
                      <div className="adm-prod-name-row">
                        <strong>{p.name}</strong>
                        {p.featured && (
                          <span className="adm-mini-pill ok">Nổi bật</span>
                        )}
                      </div>
                      <small className="adm-clamp-2">
                        {p.ingredient || p.manufacturer || `SP-${p.id}`}
                      </small>
                      <small>
                        <code>{p.slug}</code>
                        {Number(p.reviewCount) > 0
                          ? ` · ★ ${p.rating} (${p.reviewCount})`
                          : ''}
                        {p.usage && p.warning
                          ? ' · Đủ hướng dẫn GPP'
                          : ' · Cần bổ sung hướng dẫn/cảnh báo'}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span>
                    {p.categoryName || catNameMap.get(p.categoryId) || '—'}
                  </span>
                  <small>{p.manufacturer || 'Chưa rõ NSX'}</small>
                </td>
                <td>
                  <strong>{money(p.price)}</strong>
                  <small>/ {p.unit}</small>
                  {hasDiscount && (
                    <div className="adm-price-old-row">
                      <s>{money(p.oldPrice)}</s>
                      {discountPct > 0 && (
                        <span className="adm-mini-pill warn">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <Badge value={stockState}>
                    {stock === 0
                      ? 'Hết hàng (0)'
                      : `${count(stock)} ${p.unit || ''}`}
                  </Badge>
                </td>
                <td>
                  <Badge
                    value={
                      p.prescriptionRequired ? 'pending_prescription' : 'active'
                    }
                  >
                    {p.prescriptionRequired ? 'Kê đơn' : 'Không kê đơn'}
                  </Badge>
                </td>
                <td>
                  <Badge value={p.active === false ? 'inactive' : 'active'}>
                    {p.active === false ? 'Đã ẩn' : 'Đang bán'}
                  </Badge>
                </td>
                <td>
                  <div className="adm-row-actions">
                    {canManageInventory && (
                      <button
                        type="button"
                        className="adm-btn small"
                        onClick={() => onOpenReceipt({ productId: p.id })}
                        title="Nhập thêm lô hàng cho sản phẩm này"
                      >
                        <Boxes size={14} />
                        Nhập kho
                      </button>
                    )}
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label={`Sửa ${p.name}`}
                      onClick={() => onOpenProduct(p)}
                    >
                      <Pencil size={15} />
                    </button>
                    {p.active === false ? (
                      <button
                        type="button"
                        className="adm-btn small"
                        onClick={() => onToggleActive('products', p, true)}
                      >
                        <RefreshCw size={13} />
                        Hiện lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-icon-btn danger"
                        aria-label={`Ẩn ${p.name}`}
                        onClick={() =>
                          onOpenDelete({ ...p, resource: 'products' })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={filteredRows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun="sản phẩm"
        />
      </section>
    </>
  );
}
