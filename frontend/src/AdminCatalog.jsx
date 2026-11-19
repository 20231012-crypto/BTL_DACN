import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Tags,
  TicketPercent,
  Trash2,
  X,
} from 'lucide-react';
import { searchScore } from '../../shared/search.js';
import Pagination from './Pagination.jsx';
import { money } from './lib.js';
import {
  Badge,
  FilterChips,
  KpiGrid,
  Table,
  count,
  fmtDate,
  list,
  promoRuntimeStatus,
  text,
  vnDate,
} from './adminUi.jsx';

export function AdminProducts({
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
    if (stockFilter === 'low' && !(stock > 0 && stock < threshold)) return false;
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
    query || filter || categoryFilter || stockFilter || activeFilter || sortBy !== 'default',
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
                  <span>{p.categoryName || catNameMap.get(p.categoryId) || '—'}</span>
                  <small>{p.manufacturer || 'Chưa rõ NSX'}</small>
                </td>
                <td>
                  <strong>{money(p.price)}</strong>
                  <small>/ {p.unit}</small>
                  {hasDiscount && (
                    <div className="adm-price-old-row">
                      <s>{money(p.oldPrice)}</s>
                      {discountPct > 0 && (
                        <span className="adm-mini-pill warn">-{discountPct}%</span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <Badge value={stockState}>
                    {stock === 0 ? 'Hết hàng (0)' : `${count(stock)} ${p.unit || ''}`}
                  </Badge>
                </td>
                <td>
                  <Badge
                    value={p.prescriptionRequired ? 'pending_prescription' : 'active'}
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
                        onClick={() => onOpenDelete({ ...p, resource: 'products' })}
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

export function AdminCatalogEntities({
  rows,
  tab,
  setTab,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenCatalog,
  onOpenDelete,
  onToggleActive,
}) {
  const all = list(rows);
  const tabMeta =
    tab === 'suppliers'
      ? {
          noun: 'nhà cung cấp',
          linkNoun: 'phiếu nhập',
          Icon: Building2,
        }
      : tab === 'manufacturers'
        ? {
            noun: 'nhà sản xuất',
            linkNoun: 'sản phẩm',
            Icon: Package,
          }
        : {
            noun: 'danh mục',
            linkNoun: 'sản phẩm',
            Icon: Tags,
          };

  const activeCount = all.filter((x) => x.active !== false).length;
  const inactiveCount = all.length - activeCount;
  const totalLinked = all.reduce((n, x) => n + Number(x.itemCount || 0), 0);

  const kpiCards = [
    {
      key: 'all',
      label: `Tổng ${tabMeta.noun}`,
      value: count(all.length),
      sub: 'Toàn bộ bản ghi hiện có',
      Icon: tabMeta.Icon,
      tone: 'tone-0',
      active: !filter,
      onClick: () => setFilter(''),
    },
    {
      key: 'active',
      label: 'Đang hoạt động',
      value: count(activeCount),
      sub: 'Được phép lựa chọn & hiển thị',
      Icon: CheckCircle2,
      tone: 'tone-1',
      active: filter === 'active',
      onClick: () => setFilter(filter === 'active' ? '' : 'active'),
    },
    {
      key: 'inactive',
      label: 'Tạm ngưng',
      value: count(inactiveCount),
      sub: 'Đã ngừng sử dụng mới',
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: filter === 'inactive',
      onClick: () => setFilter(filter === 'inactive' ? '' : 'inactive'),
    },
    {
      key: 'linked',
      label: `Liên kết ${tabMeta.linkNoun}`,
      value: count(totalLinked),
      sub: `Tổng số ${tabMeta.linkNoun} gắn kèm`,
      Icon: Boxes,
      tone: 'tone-3',
    },
  ];

  const filteredRows = all.filter((item) => {
    if (filter === 'active' && item.active === false) return false;
    if (filter === 'inactive' && item.active !== false) return false;
    if (!query) return true;
    const hay = [
      item.name,
      item.slug,
      item.description,
      item.country,
      item.phone,
      item.email,
      item.address,
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 15;
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
        <div className="adm-tabs">
          {[
            ['categories', 'Danh mục sản phẩm'],
            ['suppliers', 'Nhà cung cấp'],
            ['manufacturers', 'Nhà sản xuất'],
          ].map(([k, t]) => (
            <button
              type="button"
              key={k}
              className={tab === k ? 'active' : ''}
              onClick={() => {
                setTab(k);
                setQuery('');
                setFilter('');
              }}
            >
              {t}
              {tab === k && <span>{all.length}</span>}
            </button>
          ))}
        </div>

        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { key: '', label: 'Tất cả', count: all.length },
            { key: 'active', label: 'Đang hoạt động', count: activeCount },
            { key: 'inactive', label: 'Tạm ngưng', count: inactiveCount },
          ]}
        />

        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Tìm ${tabMeta.noun} theo tên, mã, thông tin liên hệ...`}
              aria-label={`Tìm ${tabMeta.noun}`}
            />
          </div>
          <div className="adm-toolbar-right">
            {(query || filter) && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setFilter('');
                }}
              >
                <X size={15} />
                Đặt lại
              </button>
            )}
            <button
              type="button"
              className="adm-btn primary"
              onClick={() => onOpenCatalog({ active: true })}
            >
              <Plus size={17} />
              Thêm {tabMeta.noun}
            </button>
          </div>
        </div>

        <Table
          columns={
            tab === 'categories'
              ? ['Danh mục', 'Mã đường dẫn', 'Mô tả', 'Sản phẩm', 'Trạng thái', '']
              : tab === 'suppliers'
                ? ['Nhà cung cấp', 'Liên hệ', 'Địa chỉ', 'Phiếu nhập', 'Trạng thái', '']
                : ['Nhà sản xuất', 'Quốc gia', 'Sản phẩm', 'Trạng thái', '']
          }
          rows={visible}
          empty={`Chưa có ${tabMeta.noun} nào`}
        >
          {visible.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.name}</strong>
              </td>
              {tab === 'categories' ? (
                <>
                  <td>
                    <code>{item.slug}</code>
                  </td>
                  <td className="adm-cell-wrap">
                    <span className="adm-clamp-2">{text(item.description)}</span>
                  </td>
                </>
              ) : tab === 'suppliers' ? (
                <>
                  <td>
                    <span>{text(item.phone)}</span>
                    {item.email && <small>{item.email}</small>}
                  </td>
                  <td className="adm-cell-wrap">{text(item.address)}</td>
                </>
              ) : (
                <td>{text(item.country)}</td>
              )}
              <td>
                <strong>{count(item.itemCount || 0)}</strong>{' '}
                <span className="adm-muted-text">{tabMeta.linkNoun}</span>
              </td>
              <td>
                <Badge value={item.active === false ? 'inactive' : 'active'} />
              </td>
              <td>
                <div className="adm-row-actions">
                  <button
                    type="button"
                    className="adm-icon-btn"
                    aria-label={`Sửa ${item.name}`}
                    onClick={() => onOpenCatalog(item)}
                  >
                    <Pencil size={15} />
                  </button>
                  {item.active === false ? (
                    <button
                      type="button"
                      className="adm-btn small"
                      onClick={() => onToggleActive(tab, item, true)}
                    >
                      <RefreshCw size={13} />
                      Kích hoạt
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="adm-icon-btn danger"
                      aria-label={`Ngừng hoạt động ${item.name}`}
                      onClick={() => onOpenDelete({ ...item, resource: tab })}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={filteredRows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun={tabMeta.noun}
        />
      </section>
    </>
  );
}

export function AdminPromotions({
  rows,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenPromotion,
  onOpenDelete,
  onToggleActive,
}) {
  const todayStr = vnDate(0);
  const all = list(rows).map((p) => ({
    ...p,
    runtimeStatus: promoRuntimeStatus(p, todayStr),
  }));
  const runningCount = all.filter((p) => p.runtimeStatus === 'running').length;
  const upcomingCount = all.filter((p) => p.runtimeStatus === 'upcoming').length;
  const expiredCount = all.filter((p) => p.runtimeStatus === 'expired').length;
  const exhaustedCount = all.filter((p) => p.runtimeStatus === 'exhausted').length;
  const inactiveCount = all.filter((p) => p.runtimeStatus === 'inactive').length;
  const totalUsed = all.reduce((n, p) => n + Number(p.usedCount || 0), 0);

  const kpiCards = [
    {
      key: 'running',
      label: 'Đang chạy',
      value: count(runningCount),
      sub: 'Khách có thể áp mã ngay',
      Icon: CheckCircle2,
      tone: 'tone-1',
      active: filter === 'running',
      onClick: () => setFilter(filter === 'running' ? '' : 'running'),
    },
    {
      key: 'upcoming',
      label: 'Sắp diễn ra',
      value: count(upcomingCount),
      sub: 'Chưa tới ngày bắt đầu',
      Icon: Clock,
      tone: 'tone-3',
      active: filter === 'upcoming',
      onClick: () => setFilter(filter === 'upcoming' ? '' : 'upcoming'),
    },
    {
      key: 'ended',
      label: 'Hết hạn / Hết lượt',
      value: count(expiredCount + exhaustedCount),
      sub: `${count(expiredCount)} hết hạn · ${count(exhaustedCount)} hết lượt`,
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: filter === 'ended',
      onClick: () => setFilter(filter === 'ended' ? '' : 'ended'),
    },
    {
      key: 'used',
      label: 'Tổng lượt đã dùng',
      value: count(totalUsed),
      sub: `Trên ${count(all.length)} chương trình`,
      Icon: TicketPercent,
      tone: 'tone-0',
    },
  ];

  const filteredRows = all.filter((p) => {
    if (filter === 'ended') {
      if (!['expired', 'exhausted'].includes(p.runtimeStatus)) return false;
    } else if (filter && p.runtimeStatus !== filter) return false;
    if (!query) return true;
    const hay = [p.code, p.name].filter(Boolean).join(' ');
    return searchScore(hay, query) > 0;
  });

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
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { key: '', label: 'Tất cả', count: all.length },
            { key: 'running', label: 'Đang chạy', count: runningCount },
            { key: 'upcoming', label: 'Sắp diễn ra', count: upcomingCount },
            { key: 'expired', label: 'Hết hạn', count: expiredCount },
            { key: 'exhausted', label: 'Hết lượt', count: exhaustedCount },
            { key: 'inactive', label: 'Tạm ngưng', count: inactiveCount },
          ]}
        />
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã khuyến mãi, tên chương trình..."
              aria-label="Tìm khuyến mãi"
            />
          </div>
          <div className="adm-toolbar-right">
            {(query || filter) && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setFilter('');
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
                onOpenPromotion({
                  type: 'percent',
                  value: 10,
                  minOrder: 0,
                  maxDiscount: '',
                  usageLimit: 100,
                  startDate: vnDate(0),
                  endDate: vnDate(30),
                  active: true,
                })
              }
            >
              <Plus size={17} />
              Tạo khuyến mãi
            </button>
          </div>
        </div>

        <Table
          columns={[
            'Mã & Tên chương trình',
            'Mức giảm',
            'Đơn tối thiểu',
            'Thời gian áp dụng',
            'Tiến độ sử dụng',
            'Trạng thái thực tế',
            '',
          ]}
          rows={visible}
          empty="Chưa có mã khuyến mãi nào"
        >
          {visible.map((p) => {
            const used = Number(p.usedCount || 0);
            const limit = Number(p.usageLimit || 0);
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const endDiff = p.endDate
              ? Math.round(
                  (Date.parse(`${String(p.endDate).slice(0, 10)}T00:00:00Z`) -
                    Date.parse(`${todayStr}T00:00:00Z`)) /
                    86400000,
                )
              : null;
            const startDiff = p.startDate
              ? Math.round(
                  (Date.parse(`${String(p.startDate).slice(0, 10)}T00:00:00Z`) -
                    Date.parse(`${todayStr}T00:00:00Z`)) /
                    86400000,
                )
              : null;
            return (
              <tr key={p.id}>
                <td className="adm-cell-wrap">
                  <div className="adm-prod-name-row">
                    <strong className="adm-promo-code">{p.code}</strong>
                    <button
                      type="button"
                      className="adm-quick-chip"
                      onClick={() => navigator.clipboard?.writeText(p.code)}
                      title="Sao chép mã khuyến mãi"
                    >
                      Sao chép
                    </button>
                  </div>
                  <small>{p.name}</small>
                </td>
                <td className="adm-green">
                  <strong>
                    {p.type === 'percent' ? `${p.value}%` : money(p.value)}
                  </strong>
                  <small>
                    {p.type === 'percent'
                      ? Number(p.maxDiscount) > 0
                        ? `Tối đa ${money(p.maxDiscount)}`
                        : 'Không giới hạn giảm tối đa'
                      : 'Giảm trực tiếp'}
                  </small>
                </td>
                <td>{Number(p.minOrder) > 0 ? money(p.minOrder) : 'Không yêu cầu'}</td>
                <td>
                  <span>
                    {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                  </span>
                  {startDiff !== null && startDiff > 0 ? (
                    <small className="adm-amber">
                      Bắt đầu sau {startDiff} ngày
                    </small>
                  ) : endDiff !== null && endDiff < 0 ? (
                    <small className="adm-red">
                      Đã hết hạn {Math.abs(endDiff)} ngày
                    </small>
                  ) : endDiff !== null ? (
                    <small>
                      {endDiff === 0
                        ? 'Hết hạn hôm nay'
                        : `Còn ${endDiff} ngày hiệu lực`}
                    </small>
                  ) : null}
                </td>
                <td>
                  <div className="adm-usage-box">
                    <div className="adm-usage-head">
                      <strong>
                        {count(used)} / {limit > 0 ? count(limit) : '∞'}
                      </strong>
                      {limit > 0 && <span>{pct}%</span>}
                    </div>
                    {limit > 0 && (
                      <div className="adm-progress">
                        <span
                          className={
                            pct >= 100 ? 'is-full' : pct >= 85 ? 'is-high' : ''
                          }
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <Badge value={p.runtimeStatus} />
                </td>
                <td>
                  <div className="adm-row-actions">
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label={`Sửa ${p.code}`}
                      onClick={() => onOpenPromotion(p)}
                    >
                      <Pencil size={15} />
                    </button>
                    {!p.active ? (
                      <button
                        type="button"
                        className="adm-btn small"
                        onClick={() => onToggleActive('promotions', p, true)}
                      >
                        <RefreshCw size={13} />
                        Bật lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-icon-btn danger"
                        aria-label={`Ngừng ${p.code}`}
                        onClick={() =>
                          onOpenDelete({ ...p, resource: 'promotions' })
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
          noun="khuyến mãi"
        />
      </section>
    </>
  );
}
