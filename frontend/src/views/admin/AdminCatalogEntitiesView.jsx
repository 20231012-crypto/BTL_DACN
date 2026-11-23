/**
 * Admin Categories, Suppliers & Manufacturers Management View.
 */
import React from 'react';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { count, list, searchScore, text } from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminCatalogEntitiesView({
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
              ? [
                  'Danh mục',
                  'Mã đường dẫn',
                  'Mô tả',
                  'Sản phẩm',
                  'Trạng thái',
                  '',
                ]
              : tab === 'suppliers'
                ? [
                    'Nhà cung cấp',
                    'Liên hệ',
                    'Địa chỉ',
                    'Phiếu nhập',
                    'Trạng thái',
                    '',
                  ]
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
                    <span className="adm-clamp-2">
                      {text(item.description)}
                    </span>
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
