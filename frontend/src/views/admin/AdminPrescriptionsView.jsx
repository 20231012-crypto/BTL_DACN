/**
 * Admin Pharmacist Prescription Review Queue View.
 */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { adminLabel } from '../../models/constants.js';
import { count, fmtDate, list, money, searchScore } from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminPrescriptionsView({
  rows,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenPrescription,
  onOpenOrder,
}) {
  const all = list(rows);
  const counts = {
    all: all.length,
    pending: all.filter((r) => r.status === 'pending').length,
    partial: all.filter((r) => r.status === 'partial').length,
    approved: all.filter((r) => r.status === 'approved').length,
    rejected: all.filter((r) => r.status === 'rejected').length,
  };
  const kpiCards = [
    {
      key: 'pending',
      label: 'Chờ kiểm duyệt',
      value: count(counts.pending),
      sub: 'Ưu tiên xử lý sớm',
      Icon: Clock,
      tone: 'tone-2',
      active: filter === 'pending',
      onClick: () => setFilter(filter === 'pending' ? '' : 'pending'),
    },
    {
      key: 'partial',
      label: 'Duyệt một phần',
      value: count(counts.partial),
      sub: 'Cần khách xác nhận đơn',
      Icon: ClipboardCheck,
      tone: 'tone-3',
      active: filter === 'partial',
      onClick: () => setFilter(filter === 'partial' ? '' : 'partial'),
    },
    {
      key: 'approved',
      label: 'Đã duyệt hợp lệ',
      value: count(counts.approved),
      sub: 'Đã chuyển xử lý giao hàng',
      Icon: CheckCircle2,
      tone: 'tone-1',
      active: filter === 'approved',
      onClick: () => setFilter(filter === 'approved' ? '' : 'approved'),
    },
    {
      key: 'rejected',
      label: 'Đã từ chối',
      value: count(counts.rejected),
      sub: 'Đơn chưa đạt chuyên môn',
      Icon: AlertTriangle,
      tone: 'tone-0',
      active: filter === 'rejected',
      onClick: () => setFilter(filter === 'rejected' ? '' : 'rejected'),
    },
  ];

  const filteredRows = all.filter((rx) => {
    if (filter && rx.status !== filter) return false;
    if (!query) return true;
    const itemsText = (rx.items || []).map((i) => i.name).join(' ');
    const hay = [
      `don thuoc #${rx.id}`,
      rx.orderCode,
      rx.userName,
      rx.customerName,
      rx.userPhone,
      rx.userEmail,
      rx.reviewerName,
      rx.originalName,
      rx.fileName,
      itemsText,
    ]
      .filter(Boolean)
      .join(' ');
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
      <div className="adm-info-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>Kiểm duyệt bởi dược sĩ có chuyên môn</strong>
          <p>
            Đối chiếu rõ ảnh đơn thuốc với danh sách thuốc kê đơn trước khi
            duyệt toàn phần hoặc một phần. Mọi quyết định đều ghi nhận người
            duyệt và thời điểm xử lý.
          </p>
        </div>
      </div>
      <section className="adm-panel">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { key: '', label: 'Tất cả', count: counts.all },
            { key: 'pending', label: 'Chờ duyệt', count: counts.pending },
            {
              key: 'partial',
              label: 'Duyệt một phần',
              count: counts.partial,
            },
            { key: 'approved', label: 'Đã duyệt', count: counts.approved },
            { key: 'rejected', label: 'Từ chối', count: counts.rejected },
          ]}
        />
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã đơn thuốc, mã đơn hàng, khách hàng, SĐT, tên thuốc..."
              aria-label="Tìm đơn thuốc"
            />
          </div>
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
        </div>
        <Table
          columns={[
            'Đơn thuốc',
            'Đơn hàng',
            'Khách hàng',
            'Thuốc kê đơn',
            'Kiểm duyệt',
            'Thao tác',
          ]}
          rows={visible}
          empty="Không có đơn thuốc nào khớp bộ lọc"
        >
          {visible.map((rx) => {
            const canReview =
              rx.status === 'pending' &&
              rx.orderStatus === 'pending_prescription';
            const approvedIds = Array.isArray(rx.approvedProductIds)
              ? rx.approvedProductIds
              : [];
            return (
              <tr key={rx.id}>
                <td>
                  <strong>Đơn thuốc #{rx.id}</strong>
                  <small>
                    {fmtDate(rx.createdAt)} ·{' '}
                    {rx.originalName || rx.fileName || 'Tệp đính kèm'}
                  </small>
                </td>
                <td>
                  {rx.orderId ? (
                    <>
                      <button
                        type="button"
                        className="adm-code"
                        onClick={() =>
                          onOpenOrder({ id: rx.orderId, code: rx.orderCode })
                        }
                      >
                        {rx.orderCode || `#${rx.orderId}`}
                      </button>
                      <small>
                        {rx.orderTotal ? `${money(rx.orderTotal)} · ` : ''}
                        {adminLabel(rx.orderStatus)}
                      </small>
                    </>
                  ) : (
                    <span>Chưa gắn đơn hàng</span>
                  )}
                </td>
                <td>
                  <strong>
                    {rx.userName || rx.customerName || 'Khách hàng'}
                  </strong>
                  <small>{rx.userPhone || rx.userEmail || '—'}</small>
                </td>
                <td className="adm-cell-wrap">
                  {rx.items?.length ? (
                    <div className="adm-rx-items-mini">
                      {rx.items.map((it) => {
                        const isPartialApproved =
                          rx.status === 'partial' &&
                          approvedIds.includes(it.productId);
                        return (
                          <div key={it.productId} className="adm-rx-item-line">
                            <span>
                              {it.name} <b>×{it.quantity}</b>
                            </span>
                            {rx.status === 'partial' && (
                              <span
                                className={`adm-mini-pill ${isPartialApproved ? 'ok' : 'no'}`}
                              >
                                {isPartialApproved ? 'Duyệt' : 'Loại'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="adm-muted-text">
                      Không có thuốc kê đơn
                    </span>
                  )}
                </td>
                <td>
                  <Badge value={rx.status}>
                    {rx.status === 'pending' ? 'Chờ duyệt' : undefined}
                  </Badge>
                  <small>
                    {rx.reviewerName
                      ? `${rx.reviewerName} · ${fmtDate(rx.reviewedAt)}`
                      : 'Chưa kiểm duyệt'}
                  </small>
                </td>
                <td>
                  <div className="adm-row-actions">
                    <button
                      type="button"
                      className={`adm-btn small ${canReview ? 'primary' : ''}`}
                      onClick={() => onOpenPrescription(rx)}
                    >
                      {canReview ? (
                        <ClipboardCheck size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                      {canReview ? 'Kiểm duyệt' : 'Chi tiết'}
                    </button>
                    <a
                      className="adm-icon-btn"
                      href={`/api/prescriptions/${rx.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Mở tệp đơn thuốc #${rx.id}`}
                      title="Mở tệp gốc"
                    >
                      <ExternalLink size={15} />
                    </a>
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
          noun="đơn thuốc"
        />
      </section>
    </>
  );
}
