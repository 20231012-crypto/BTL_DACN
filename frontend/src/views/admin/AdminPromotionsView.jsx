/**
 * Admin Promotions Management View.
 */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  Trash2,
  X,
} from 'lucide-react';
import {
  count,
  fmtDate,
  list,
  money,
  promoRuntimeStatus,
  searchScore,
  vnDate,
} from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminPromotionsView({
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
  const upcomingCount = all.filter(
    (p) => p.runtimeStatus === 'upcoming',
  ).length;
  const expiredCount = all.filter((p) => p.runtimeStatus === 'expired').length;
  const exhaustedCount = all.filter(
    (p) => p.runtimeStatus === 'exhausted',
  ).length;
  const inactiveCount = all.filter(
    (p) => p.runtimeStatus === 'inactive',
  ).length;
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
            const pct =
              limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const endDiff = p.endDate
              ? Math.round(
                  (Date.parse(`${String(p.endDate).slice(0, 10)}T00:00:00Z`) -
                    Date.parse(`${todayStr}T00:00:00Z`)) /
                    86400000,
                )
              : null;
            const startDiff = p.startDate
              ? Math.round(
                  (Date.parse(
                    `${String(p.startDate).slice(0, 10)}T00:00:00Z`,
                  ) -
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
                <td>
                  {Number(p.minOrder) > 0
                    ? money(p.minOrder)
                    : 'Không yêu cầu'}
                </td>
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
