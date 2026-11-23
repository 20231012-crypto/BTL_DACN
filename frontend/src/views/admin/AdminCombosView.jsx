/**
 * Admin Product Combos Management View.
 */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { count, list, money, searchScore } from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminCombosView({
  rows,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenCombo,
  onOpenDelete,
  onToggleActive,
}) {
  const all = list(rows);
  const activeCount = all.filter((c) => c.active).length;
  const inStockCount = all.filter((c) => c.active && c.stock > 0).length;
  const outCount = all.filter((c) => c.active && c.stock <= 0).length;
  const inactiveCount = all.filter((c) => !c.active).length;

  const kpiCards = [
    {
      key: 'all',
      label: 'Tổng gói combo',
      value: count(all.length),
      sub: 'Tổ hợp sản phẩm đã cấu hình',
      Icon: Layers,
      tone: 'tone-0',
      active: filter === '',
      onClick: () => setFilter(''),
    },
    {
      key: 'active',
      label: 'Đang mở bán',
      value: count(inStockCount),
      sub: 'Đang bật & đủ tồn thành phần',
      Icon: CheckCircle2,
      tone: 'tone-1',
      active: filter === 'active',
      onClick: () => setFilter(filter === 'active' ? '' : 'active'),
    },
    {
      key: 'out',
      label: 'Tạm hết tồn combo',
      value: count(outCount),
      sub: 'Thiếu tồn kho sản phẩm con',
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: filter === 'out',
      onClick: () => setFilter(filter === 'out' ? '' : 'out'),
    },
    {
      key: 'inactive',
      label: 'Đang tạm ngưng',
      value: count(inactiveCount),
      sub: 'Ẩn khỏi cửa hàng',
      Icon: Layers,
      tone: 'tone-3',
      active: filter === 'inactive',
      onClick: () => setFilter(filter === 'inactive' ? '' : 'inactive'),
    },
  ];

  const filtered = all.filter((combo) => {
    if (filter === 'active' && !(combo.active && combo.stock > 0)) return false;
    if (filter === 'out' && !(combo.active && combo.stock <= 0)) return false;
    if (filter === 'inactive' && combo.active) return false;
    if (!query) return true;
    const hay = [
      combo.name,
      combo.description,
      ...(combo.items || []).map((i) => i.product?.name || ''),
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
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
            { key: 'active', label: 'Đang mở bán', count: inStockCount },
            { key: 'out', label: 'Hết tồn', count: outCount },
            { key: 'inactive', label: 'Tạm ngưng', count: inactiveCount },
          ]}
        />
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên combo hoặc sản phẩm thành phần..."
              aria-label="Tìm combo sản phẩm"
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
                <X size={15} /> Đặt lại
              </button>
            )}
            <button
              type="button"
              className="adm-btn primary"
              onClick={() =>
                onOpenCombo({
                  name: '',
                  description: '',
                  image: '/assets/products/vitamin-c.svg',
                  price: '',
                  active: true,
                  items: [
                    { productId: '', quantity: 1 },
                    { productId: '', quantity: 1 },
                  ],
                })
              }
            >
              <Plus size={17} /> Tạo combo mới
            </button>
          </div>
        </div>

        <Table
          columns={[
            'Combo sản phẩm',
            'Thành phần tổ hợp',
            'Giá combo / Giá gốc',
            'Tồn khả dụng',
            'Trạng thái',
            '',
          ]}
          rows={visible}
          empty="Chưa có gói combo sản phẩm nào"
        >
          {visible.map((combo) => (
            <tr key={combo.id}>
              <td className="adm-cell-wrap">
                <div className="adm-prod-cell">
                  <img
                    src={combo.image || '/assets/products/vitamin-c.svg'}
                    alt=""
                    className="adm-thumb"
                  />
                  <div>
                    <strong>{combo.name}</strong>
                    {combo.description && (
                      <small>{combo.description.slice(0, 90)}</small>
                    )}
                  </div>
                </div>
              </td>
              <td className="adm-cell-wrap">
                <div className="adm-combo-item-tags">
                  {(combo.items || []).map((ci) => (
                    <span
                      key={ci.id || ci.productId}
                      className="adm-combo-item-chip"
                    >
                      <b>{ci.quantity}×</b>{' '}
                      {ci.product?.name || `SP #${ci.productId}`}
                    </span>
                  ))}
                </div>
              </td>
              <td className="adm-green">
                <strong>{money(combo.price)}</strong>
                <small>
                  Gốc: {money(combo.originalPrice)}
                  {combo.savings > 0
                    ? ` · Tiết kiệm ${money(combo.savings)}`
                    : ''}
                </small>
              </td>
              <td>
                <strong>{count(combo.stock)}</strong>
                <small>gói khả dụng</small>
              </td>
              <td>
                <Badge value={combo.active ? 'active' : 'inactive'}>
                  {combo.active ? 'Đang bán' : 'Tạm ngưng'}
                </Badge>
              </td>
              <td>
                <div className="adm-row-actions">
                  <button
                    type="button"
                    className="adm-btn small"
                    onClick={() => onOpenCombo(combo)}
                  >
                    <Pencil size={14} /> Sửa
                  </button>
                  {combo.active ? (
                    <button
                      type="button"
                      className="adm-btn small danger"
                      onClick={() =>
                        onOpenDelete({
                          id: combo.id,
                          name: combo.name,
                          resource: 'combos',
                          verb: 'tạm ngưng bán combo',
                        })
                      }
                    >
                      <Trash2 size={14} /> Ẩn
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="adm-btn small"
                      onClick={() => onToggleActive('combos', combo, true)}
                    >
                      <RefreshCw size={14} /> Mở lại
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={filtered.length}
          perPage={perPage}
          onChange={setPage}
        />
      </section>
    </>
  );
}
