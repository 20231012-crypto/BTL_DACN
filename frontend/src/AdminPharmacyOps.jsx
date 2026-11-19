import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { searchScore } from '../../shared/search.js';
import Pagination from './Pagination.jsx';
import { dateTime, money } from './lib.js';
import {
  Badge,
  FilterChips,
  KpiGrid,
  Table,
  compactMoney,
  count,
  fmtDate,
  label,
  list,
  vnDate,
} from './adminUi.jsx';

const daysBetweenIso = (targetIso, baseIso = vnDate(0)) => {
  if (!targetIso) return null;
  const t = Date.parse(`${String(targetIso).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(baseIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(b)) return null;
  return Math.round((t - b) / 86400000);
};

export function AdminPrescriptions({
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
            duyệt toàn phần hoặc một phần. Mọi quyết định đều ghi nhận người duyệt
            và thời điểm xử lý.
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
            { key: 'partial', label: 'Duyệt một phần', count: counts.partial },
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
              rx.status === 'pending' && rx.orderStatus === 'pending_prescription';
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
                        {label(rx.orderStatus)}
                      </small>
                    </>
                  ) : (
                    <span>Chưa gắn đơn hàng</span>
                  )}
                </td>
                <td>
                  <strong>{rx.userName || rx.customerName || 'Khách hàng'}</strong>
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
                    <span className="adm-muted-text">Không có thuốc kê đơn</span>
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
                      {canReview ? <ClipboardCheck size={14} /> : <Eye size={14} />}
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

export function AdminInventory({
  data,
  tab,
  setTab,
  query,
  setQuery,
  page,
  setPage,
  lowStockThreshold = 15,
  onOpenReceipt,
  onOpenAdjustment,
}) {
  const [subFilter, setSubFilter] = useState('');
  useEffect(() => {
    setPage(1);
  }, [subFilter, setPage]);

  const todayStr = vnDate(0);
  const batches = list(data?.batches);
  const alerts = list(data?.alerts);
  const movements = list(data?.movements);
  const summary = data?.summary || {};
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const reservedBatchCount = batches.filter((b) => Number(b.reserved) > 0).length;

  const kpiCards = [
    {
      key: 'sellable',
      label: 'Tồn khả dụng',
      value: count(summary.sellable),
      sub: `${count(batches.length)} lô đang theo dõi`,
      Icon: Boxes,
      tone: 'tone-1',
      active: tab === 'batches' && subFilter === 'available',
      onClick: () => {
        setTab('batches');
        setSubFilter(
          tab === 'batches' && subFilter === 'available' ? '' : 'available',
        );
      },
    },
    {
      key: 'reserved',
      label: 'Đang giữ chỗ',
      value: count(summary.reserved),
      sub: `${count(reservedBatchCount)} lô đang giữ cho đơn`,
      Icon: Clock,
      tone: 'tone-3',
      active: tab === 'batches' && subFilter === 'reserved',
      onClick: () => {
        setTab('batches');
        setSubFilter(
          tab === 'batches' && subFilter === 'reserved' ? '' : 'reserved',
        );
      },
    },
    {
      key: 'expired',
      label: 'Tồn hết hạn',
      value: count(summary.expired),
      sub: `${count(alerts.filter((a) => a.type === 'expired').length)} lô hết hạn cần xử lý`,
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: tab === 'alerts' && subFilter === 'expired',
      onClick: () => {
        setTab('alerts');
        setSubFilter('expired');
      },
    },
    {
      key: 'out',
      label: 'SP hết hàng',
      value: count(summary.outOfStockCount),
      sub: `Ngưỡng cảnh báo: < ${count(lowStockThreshold)}`,
      Icon: Package,
      tone: 'tone-2',
      active: tab === 'alerts' && subFilter === 'low_stock',
      onClick: () => {
        setTab('alerts');
        setSubFilter('low_stock');
      },
    },
    {
      key: 'value',
      label: 'Giá trị vốn tồn kho',
      value: compactMoney(summary.value),
      sub: money(summary.value),
      Icon: Wallet,
      tone: 'tone-0',
    },
  ];

  const source =
    tab === 'alerts' ? alerts : tab === 'movements' ? movements : batches;
  const rows = source.filter((item) => {
    if (subFilter) {
      if (tab === 'batches') {
        if (subFilter === 'nonzero' && item.quantity <= 0) return false;
        if (subFilter === 'zero' && item.quantity > 0) return false;
        if (subFilter === 'reserved' && !(Number(item.reserved) > 0))
          return false;
        if (
          ['available', 'expiring', 'expired'].includes(subFilter) &&
          item.status !== subFilter
        )
          return false;
      } else if (tab === 'alerts' && item.type !== subFilter) return false;
      else if (tab === 'movements' && item.type !== subFilter) return false;
    }
    if (!query) return true;
    const hay = [
      item.productName,
      item.batchNumber,
      item.supplierName,
      item.userName,
      item.reason,
      item.orderId ? `#${item.orderId}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 15;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const noun =
    tab === 'alerts'
      ? 'cảnh báo'
      : tab === 'movements'
        ? 'biến động'
        : 'lô thuốc';

  const openAdjustForBatch = (batch, prefill = {}) =>
    onOpenAdjustment({
      batchId: batch.id,
      productName: batch.productName,
      batchNumber: batch.batchNumber,
      currentQuantity: batch.quantity,
      reserved: batch.reserved || 0,
      available:
        batch.available ??
        Math.max(0, (batch.quantity || 0) - (batch.reserved || 0)),
      expiresAt: batch.expiresAt,
      quantity: prefill.quantity ?? 0,
      reason: prefill.reason ?? '',
    });

  const renderExpiryCountdown = (expiresAt) => {
    const diff = daysBetweenIso(expiresAt, todayStr);
    if (diff === null) return null;
    if (diff < 0)
      return (
        <small className="adm-red">Đã quá hạn {Math.abs(diff)} ngày</small>
      );
    if (diff === 0)
      return <small className="adm-red">Hết hạn trong hôm nay</small>;
    if (diff <= 60)
      return <small className="adm-amber">Còn {diff} ngày (Cận hạn)</small>;
    return <small>Còn {diff} ngày</small>;
  };

  return (
    <>
      <KpiGrid cards={kpiCards} />
      <section className="adm-panel">
        <div className="adm-tabs">
          {[
            ['batches', 'Danh sách lô thuốc', batches.length],
            ['alerts', 'Cảnh báo kho', alerts.length],
            ['movements', 'Lịch sử xuất nhập', movements.length],
          ].map(([key, title, n]) => (
            <button
              type="button"
              className={tab === key ? 'active' : ''}
              key={key}
              onClick={() => {
                setTab(key);
                setSubFilter('');
              }}
            >
              {title}
              <span>{n}</span>
            </button>
          ))}
        </div>

        {tab === 'alerts' && (
          <FilterChips
            value={subFilter}
            onChange={setSubFilter}
            options={[
              { key: '', label: 'Tất cả cảnh báo', count: alerts.length },
              {
                key: 'expired',
                label: 'Hết hạn',
                count: alerts.filter((a) => a.type === 'expired').length,
              },
              {
                key: 'expiring',
                label: 'Sắp hết hạn',
                count: alerts.filter((a) => a.type === 'expiring').length,
              },
              {
                key: 'low_stock',
                label: 'Sắp hết / Hết hàng',
                count: alerts.filter((a) => a.type === 'low_stock').length,
              },
            ]}
          />
        )}

        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên thuốc, mã lô, nhà cung cấp, người thao tác..."
              aria-label="Tìm kiếm kho"
            />
          </div>
          <div className="adm-toolbar-right">
            {tab === 'batches' && (
              <select
                className="adm-select"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                aria-label="Lọc trạng thái lô"
              >
                <option value="">Tất cả lô thuốc</option>
                <option value="available">Có thể bán</option>
                <option value="reserved">Đang giữ cho đơn (&gt; 0)</option>
                <option value="expiring">Sắp hết hạn</option>
                <option value="expired">Đã hết hạn</option>
                <option value="nonzero">Còn tồn trong kho</option>
                <option value="zero">Đã xuất hết (0)</option>
              </select>
            )}
            {tab === 'movements' && (
              <select
                className="adm-select"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                aria-label="Lọc loại biến động"
              >
                <option value="">Tất cả biến động</option>
                <option value="receipt">Nhập kho</option>
                <option value="sale">Xuất bán</option>
                <option value="reserve">Giữ chỗ</option>
                <option value="release">Hoàn giữ chỗ</option>
                <option value="adjustment">Điều chỉnh</option>
                <option value="return_restore">Nhập lại hàng trả</option>
                <option value="cancel_restore">Hoàn kho hủy đơn</option>
              </select>
            )}
            {(query || subFilter) && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setSubFilter('');
                }}
              >
                <X size={15} />
                Đặt lại
              </button>
            )}
            <button
              type="button"
              className="adm-btn primary"
              onClick={() => onOpenReceipt({})}
            >
              <Plus size={17} />
              Nhập kho theo lô
            </button>
          </div>
        </div>

        {tab === 'alerts' ? (
          <Table
            columns={[
              'Mức cảnh báo',
              'Sản phẩm / Mã lô',
              'Tồn hiện tại',
              'Hạn sử dụng',
              'Hướng xử lý GPP',
              'Thao tác',
            ]}
            rows={visible}
            empty="Kho hàng đang ổn định, không có cảnh báo"
          >
            {visible.map((a, i) => {
              const linkedBatch = a.batchId ? batchById.get(a.batchId) : null;
              const discardQty = linkedBatch
                ? -Math.max(
                    0,
                    (linkedBatch.quantity || 0) - (linkedBatch.reserved || 0),
                  )
                : 0;
              return (
                <tr key={`${a.type}-${a.productId}-${a.batchId || i}`}>
                  <td>
                    <Badge value={a.type} />
                  </td>
                  <td className="adm-cell-wrap">
                    <strong>{a.productName}</strong>
                    <small>
                      {a.batchNumber
                        ? `Lô ${a.batchNumber}`
                        : `Mã sản phẩm #${a.productId}`}
                    </small>
                  </td>
                  <td>
                    <strong className={a.quantity === 0 ? 'adm-red' : ''}>
                      {count(a.quantity)}
                    </strong>
                    <small>
                      {a.type === 'low_stock'
                        ? a.quantity === 0
                          ? 'Đã hết sạch'
                          : `Ngưỡng < ${count(lowStockThreshold)}`
                        : 'Đơn vị trong lô'}
                    </small>
                  </td>
                  <td>
                    {a.expiresAt ? (
                      <>
                        <span>{fmtDate(a.expiresAt)}</span>
                        {renderExpiryCountdown(a.expiresAt)}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="adm-cell-wrap">
                    <small className="adm-gpp-note">
                      {a.type === 'expired'
                        ? 'Đã tự động khóa xuất bán (FEFO). Cần lập phiếu điều chỉnh xuất hủy lô hết hạn.'
                        : a.type === 'expiring'
                          ? 'Lô cận hạn dùng. Hệ thống ưu tiên xuất bán trước (FEFO) hoặc kiểm kê lại.'
                          : 'Tồn khả dụng dưới ngưỡng an toàn. Cần lập phiếu nhập kho bổ sung từ nhà cung cấp.'}
                    </small>
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      {a.type === 'low_stock' ? (
                        <button
                          type="button"
                          className="adm-btn small primary"
                          onClick={() => onOpenReceipt({ productId: a.productId })}
                        >
                          <Plus size={14} />
                          Nhập thêm
                        </button>
                      ) : a.type === 'expired' && linkedBatch ? (
                        <button
                          type="button"
                          className="adm-btn small primary"
                          onClick={() =>
                            openAdjustForBatch(linkedBatch, {
                              quantity: discardQty,
                              reason:
                                'Xuất hủy lô thuốc đã hết hạn sử dụng theo quy trình GPP',
                            })
                          }
                        >
                          <Pencil size={14} />
                          Xuất hủy lô
                        </button>
                      ) : (
                        linkedBatch && (
                          <button
                            type="button"
                            className="adm-btn small"
                            onClick={() => openAdjustForBatch(linkedBatch)}
                          >
                            <Pencil size={14} />
                            Điều chỉnh lô
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : tab === 'movements' ? (
          <Table
            columns={[
              'Thời gian',
              'Sản phẩm / Lô',
              'Biến động',
              'Số lượng',
              'Người thao tác & Lý do',
            ]}
            rows={visible}
            empty="Chưa ghi nhận biến động tồn kho"
          >
            {visible.map((m) => (
              <tr key={m.id}>
                <td>{dateTime(m.createdAt)}</td>
                <td className="adm-cell-wrap">
                  <strong>{m.productName}</strong>
                  <small>Lô {m.batchNumber}</small>
                </td>
                <td>
                  <Badge value={m.type} />
                </td>
                <td className={Number(m.quantity) < 0 ? 'adm-red' : 'adm-green'}>
                  <strong>
                    {Number(m.quantity) > 0 ? '+' : ''}
                    {count(m.quantity)}
                  </strong>
                </td>
                <td className="adm-cell-wrap">
                  <strong>
                    {m.userName || 'Hệ thống'}
                    {m.orderId ? ` · Đơn #${m.orderId}` : ''}
                  </strong>
                  <small>{m.reason || '—'}</small>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table
            columns={[
              'Sản phẩm / Mã lô',
              'Nhà cung cấp',
              'Hạn sử dụng',
              'Khả dụng / Tồn / Giữ',
              'Giá nhập & Vốn',
              'Trạng thái',
              '',
            ]}
            rows={visible}
            empty="Chưa có lô thuốc nào"
          >
            {visible.map((b) => {
              const avail = b.available ?? b.quantity - b.reserved;
              return (
                <tr key={b.id}>
                  <td className="adm-cell-wrap">
                    <strong>{b.productName}</strong>
                    <small>
                      Lô {b.batchNumber} · {b.unit || 'Đơn vị'}
                    </small>
                  </td>
                  <td className="adm-cell-wrap">
                    <span>{b.supplierName || 'Nhập trực tiếp'}</span>
                    <small>NSX: {fmtDate(b.manufacturedAt)}</small>
                  </td>
                  <td>
                    <span>{fmtDate(b.expiresAt)}</span>
                    {renderExpiryCountdown(b.expiresAt)}
                  </td>
                  <td>
                    <div className="adm-prod-name-row">
                      <strong>{count(avail)}</strong>
                      {b.status === 'expired' && b.quantity > 0 && (
                        <span className="adm-mini-pill no">Khóa FEFO</span>
                      )}
                    </div>
                    <small>
                      Tồn {count(b.quantity)} · Giữ {count(b.reserved)}
                    </small>
                  </td>
                  <td className="adm-amount">
                    <strong>{money(b.cost)}</strong>
                    <small>
                      Vốn: {money((Number(b.quantity) || 0) * (Number(b.cost) || 0))}
                    </small>
                  </td>
                  <td>
                    <Badge value={b.status || 'available'} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="adm-btn small"
                      onClick={() => openAdjustForBatch(b)}
                    >
                      Điều chỉnh
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <Pagination
          page={currentPage}
          totalItems={rows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun={noun}
        />
      </section>
    </>
  );
}

export function AdminChatbot({
  data,
  tab,
  setTab,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  hasPermission,
  canReviewKnowledge,
  onOpenSupport,
  onOpenKnowledge,
  onOpenKnowledgeReview,
  onOpenRule,
  onOpenDelete,
  onToggleActive,
}) {
  const all = list(data);
  const kpiCards =
    tab === 'knowledge'
      ? [
          {
            key: 'all',
            label: 'Tổng bài tri thức',
            value: count(all.length),
            sub: 'Cơ sở dữ liệu tư vấn',
            Icon: Sparkles,
            tone: 'tone-0',
            active: filter === '',
            onClick: () => setFilter(''),
          },
          {
            key: 'reviewed',
            label: 'Đã được dược sĩ duyệt',
            value: count(all.filter((k) => k.active && k.reviewedAt).length),
            sub: 'Đủ chuẩn sử dụng cho AI',
            Icon: CheckCircle2,
            tone: 'tone-1',
            active: filter === 'reviewed',
            onClick: () => setFilter(filter === 'reviewed' ? '' : 'reviewed'),
          },
          {
            key: 'unreviewed',
            label: 'Chờ dược sĩ rà soát',
            value: count(all.filter((k) => k.active && !k.reviewedAt).length),
            sub: 'Cần kiểm tra nguồn y khoa',
            Icon: Clock,
            tone: 'tone-2',
            active: filter === 'unreviewed',
            onClick: () => setFilter(filter === 'unreviewed' ? '' : 'unreviewed'),
          },
          {
            key: 'inactive',
            label: 'Đang tạm ẩn',
            value: count(all.filter((k) => !k.active).length),
            sub: 'Không dùng trong chatbot',
            Icon: AlertTriangle,
            tone: 'tone-3',
            active: filter === 'inactive',
            onClick: () => setFilter(filter === 'inactive' ? '' : 'inactive'),
          },
        ]
      : tab === 'rules'
        ? [
            {
              key: 'all',
              label: 'Quy tắc an toàn',
              value: count(all.length),
              sub: 'Kiểm soát nội dung y tế',
              Icon: ShieldCheck,
              tone: 'tone-0',
              active: filter === '',
              onClick: () => setFilter(''),
            },
            {
              key: 'active',
              label: 'Đang kích hoạt',
              value: count(all.filter((r) => r.active).length),
              sub: 'Đang giám sát hội thoại',
              Icon: CheckCircle2,
              tone: 'tone-1',
              active: filter === 'active',
              onClick: () => setFilter(filter === 'active' ? '' : 'active'),
            },
            {
              key: 'inactive',
              label: 'Đang tắt',
              value: count(all.filter((r) => !r.active).length),
              sub: 'Tạm ngưng kiểm tra',
              Icon: AlertTriangle,
              tone: 'tone-2',
              active: filter === 'inactive',
              onClick: () => setFilter(filter === 'inactive' ? '' : 'inactive'),
            },
            {
              key: 'keywords',
              label: 'Tổng từ khóa cảnh báo',
              value: count(
                all.reduce(
                  (n, r) =>
                    n +
                    (Array.isArray(r.keywords)
                      ? r.keywords.length
                      : String(r.keywords || '')
                          .split(',')
                          .filter((x) => x.trim()).length),
                  0,
                ),
              ),
              sub: 'Dấu hiệu chuyển dược sĩ',
              Icon: MessageSquare,
              tone: 'tone-3',
            },
          ]
        : [
            {
              key: 'pending',
              label: 'Chờ tiếp nhận',
              value: count(all.filter((s) => s.status === 'pending').length),
              sub: 'Khách đang chờ dược sĩ',
              Icon: Clock,
              tone: 'tone-2',
              active: filter === 'pending',
              onClick: () => setFilter(filter === 'pending' ? '' : 'pending'),
            },
            {
              key: 'in_progress',
              label: 'Đang tư vấn',
              value: count(all.filter((s) => s.status === 'in_progress').length),
              sub: 'Đang trao đổi trực tiếp',
              Icon: MessageSquare,
              tone: 'tone-3',
              active: filter === 'in_progress',
              onClick: () =>
                setFilter(filter === 'in_progress' ? '' : 'in_progress'),
            },
            {
              key: 'resolved',
              label: 'Đã giải quyết',
              value: count(all.filter((s) => s.status === 'resolved').length),
              sub: 'Hoàn tất phiên tư vấn',
              Icon: CheckCircle2,
              tone: 'tone-1',
              active: filter === 'resolved',
              onClick: () => setFilter(filter === 'resolved' ? '' : 'resolved'),
            },
            {
              key: 'all',
              label: 'Tổng yêu cầu',
              value: count(all.length),
              sub: 'Lịch sử hỗ trợ trực tuyến',
              Icon: ShieldCheck,
              tone: 'tone-0',
              active: filter === '',
              onClick: () => setFilter(''),
            },
          ];

  const rows = all.filter((item) => {
    if (filter) {
      if (tab === 'support' && item.status !== filter) return false;
      if (tab === 'knowledge') {
        if (filter === 'reviewed' && (!item.active || !item.reviewedAt))
          return false;
        if (filter === 'unreviewed' && (!item.active || item.reviewedAt))
          return false;
        if (filter === 'inactive' && item.active) return false;
      }
      if (tab === 'rules') {
        if (filter === 'active' && !item.active) return false;
        if (filter === 'inactive' && item.active) return false;
      }
    }
    if (!query) return true;
    const kw = Array.isArray(item.keywords)
      ? item.keywords.join(' ')
      : item.keywords;
    const hay = [
      item.title,
      item.name,
      item.source,
      item.content,
      item.response,
      item.userName,
      item.userPhone,
      item.handlerName,
      item.sessionTitle,
      item.message,
      item.reason,
      kw,
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const noun =
    tab === 'knowledge'
      ? 'bài tri thức'
      : tab === 'rules'
        ? 'quy tắc'
        : 'yêu cầu hỗ trợ';

  const chipOptions =
    tab === 'knowledge'
      ? [
          { key: '', label: 'Tất cả', count: all.length },
          {
            key: 'reviewed',
            label: 'Đã duyệt',
            count: all.filter((k) => k.active && k.reviewedAt).length,
          },
          {
            key: 'unreviewed',
            label: 'Chờ rà soát',
            count: all.filter((k) => k.active && !k.reviewedAt).length,
          },
          {
            key: 'inactive',
            label: 'Tạm ẩn',
            count: all.filter((k) => !k.active).length,
          },
        ]
      : tab === 'rules'
        ? [
            { key: '', label: 'Tất cả', count: all.length },
            {
              key: 'active',
              label: 'Đang bật',
              count: all.filter((r) => r.active).length,
            },
            {
              key: 'inactive',
              label: 'Đang tắt',
              count: all.filter((r) => !r.active).length,
            },
          ]
        : [
            { key: '', label: 'Tất cả', count: all.length },
            {
              key: 'pending',
              label: 'Chờ hỗ trợ',
              count: all.filter((s) => s.status === 'pending').length,
            },
            {
              key: 'in_progress',
              label: 'Đang tư vấn',
              count: all.filter((s) => s.status === 'in_progress').length,
            },
            {
              key: 'resolved',
              label: 'Đã giải quyết',
              count: all.filter((s) => s.status === 'resolved').length,
            },
          ];

  return (
    <>
      <KpiGrid cards={kpiCards} />
      <section className="adm-panel">
        <div className="adm-tabs">
          {hasPermission('support') && (
            <button
              type="button"
              className={tab === 'support' ? 'active' : ''}
              onClick={() => {
                setTab('support');
                setFilter('');
              }}
            >
              Yêu cầu hỗ trợ
              {tab === 'support' && <span>{all.length}</span>}
            </button>
          )}
          {(hasPermission('knowledge') || canReviewKnowledge) && (
            <>
              <button
                type="button"
                className={tab === 'knowledge' ? 'active' : ''}
                onClick={() => {
                  setTab('knowledge');
                  setFilter('');
                }}
              >
                Cơ sở tri thức
                {tab === 'knowledge' && <span>{all.length}</span>}
              </button>
              {hasPermission('knowledge') && (
                <button
                  type="button"
                  className={tab === 'rules' ? 'active' : ''}
                  onClick={() => {
                    setTab('rules');
                    setFilter('');
                  }}
                >
                  Quy tắc an toàn
                  {tab === 'rules' && <span>{all.length}</span>}
                </button>
              )}
            </>
          )}
        </div>

        <FilterChips options={chipOptions} value={filter} onChange={setFilter} />

        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'support'
                  ? 'Tìm khách hàng, SĐT, phiên tư vấn, nội dung...'
                  : 'Tìm tiêu đề, từ khóa, nguồn tham khảo...'
              }
              aria-label="Tìm kiếm tư vấn & chatbot"
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
            {tab === 'knowledge' && hasPermission('knowledge') && (
              <button
                type="button"
                className="adm-btn primary"
                onClick={() => onOpenKnowledge({ active: true })}
              >
                <Plus size={17} />
                Thêm tri thức
              </button>
            )}
          </div>
        </div>

        {tab === 'knowledge' ? (
          <Table
            columns={[
              'Nội dung tri thức & Nguồn',
              'Từ khóa',
              'Rà soát chuyên môn',
              'Thao tác',
            ]}
            rows={visible}
            empty="Chưa có tri thức nào phù hợp"
          >
            {visible.map((k) => {
              const kwList = Array.isArray(k.keywords)
                ? k.keywords
                : String(k.keywords || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
              return (
                <tr key={k.id}>
                  <td className="adm-cell-wrap">
                    <strong>{k.title}</strong>
                    <small className="adm-clamp-2">{k.content}</small>
                    {k.source && (
                      <small className="adm-source-line">Nguồn: {k.source}</small>
                    )}
                  </td>
                  <td className="adm-cell-wrap">
                    <div className="adm-tag-list">
                      {kwList.slice(0, 6).map((w) => (
                        <span key={w} className="adm-tag">
                          {w}
                        </span>
                      ))}
                      {kwList.length > 6 && (
                        <span className="adm-tag">+{kwList.length - 6}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge
                      value={
                        k.active && k.reviewedAt
                          ? 'reviewed'
                          : k.active
                            ? 'unreviewed'
                            : 'inactive'
                      }
                    />
                    <small>
                      {k.reviewedAt
                        ? `${k.reviewerName || 'Dược sĩ'} · ${fmtDate(k.reviewedAt)}`
                        : k.active
                          ? 'Chưa đối chiếu nguồn'
                          : 'Đã ngừng sử dụng'}
                    </small>
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      {canReviewKnowledge && k.active && !k.reviewedAt && (
                        <button
                          type="button"
                          className="adm-btn small primary"
                          onClick={() => onOpenKnowledgeReview(k)}
                        >
                          Rà soát
                        </button>
                      )}
                      {hasPermission('knowledge') && (
                        <>
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label={`Sửa ${k.title}`}
                            onClick={() => onOpenKnowledge(k)}
                          >
                            <Pencil size={15} />
                          </button>
                          {k.active ? (
                            <button
                              type="button"
                              className="adm-icon-btn danger"
                              aria-label={`Ngừng dùng ${k.title}`}
                              onClick={() =>
                                onOpenDelete({ ...k, resource: 'knowledge' })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adm-btn small"
                              onClick={() => onToggleActive('knowledge', k, true)}
                            >
                              <RefreshCw size={13} />
                              Bật lại
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : tab === 'rules' ? (
          <>
            <div className="adm-info-banner adm-rules-note">
              <ShieldCheck size={20} />
              <p>
                Chatbot kiểm tra từ khóa và quy tắc an toàn trước khi trả lời. Nội
                dung có dấu hiệu nguy cấp được ngắt AI và chuyển ngay tới dược sĩ.
              </p>
            </div>
            <Table
              columns={[
                'Quy tắc an toàn',
                'Từ khóa cảnh báo',
                'Phản hồi cảnh báo',
                'Trạng thái',
                '',
              ]}
              rows={visible}
              empty="Không có quy tắc an toàn nào"
            >
              {visible.map((r) => {
                const kwList = Array.isArray(r.keywords)
                  ? r.keywords
                  : String(r.keywords || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                return (
                  <tr key={r.id}>
                    <td className="adm-cell-wrap">
                      <strong>{r.name}</strong>
                      {r.pattern && <small>Nhóm: {r.pattern}</small>}
                    </td>
                    <td className="adm-cell-wrap">
                      <div className="adm-tag-list">
                        {kwList.slice(0, 6).map((w) => (
                          <span key={w} className="adm-tag">
                            {w}
                          </span>
                        ))}
                        {kwList.length > 6 && (
                          <span className="adm-tag">+{kwList.length - 6}</span>
                        )}
                      </div>
                    </td>
                    <td className="adm-cell-wrap">
                      <span className="adm-clamp-2">{r.response}</span>
                    </td>
                    <td>
                      <Badge value={r.active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-icon-btn"
                        onClick={() => onOpenRule(r)}
                        aria-label={`Sửa quy tắc ${r.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </>
        ) : (
          <Table
            columns={[
              'Khách hàng',
              'Phiên tư vấn & Lý do',
              'Phụ trách',
              'Cập nhật',
              'Trạng thái',
              '',
            ]}
            rows={visible}
            empty="Chưa có yêu cầu tư vấn nào"
          >
            {visible.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.userName || s.customerName || 'Khách hàng'}</strong>
                  <small>{s.userPhone || s.userEmail || `Hội thoại #${s.sessionId}`}</small>
                </td>
                <td className="adm-cell-wrap">
                  <strong>{s.sessionTitle || `Hội thoại #${s.sessionId}`}</strong>
                  <small>{s.message || s.reason || 'Cần dược sĩ hỗ trợ'}</small>
                </td>
                <td>
                  {s.handlerName ? (
                    <strong>{s.handlerName}</strong>
                  ) : (
                    <span className="adm-muted-text">Chưa phân công</span>
                  )}
                </td>
                <td>
                  <span>{fmtDate(s.createdAt)}</span>
                  {s.updatedAt && <small>{dateTime(s.updatedAt)}</small>}
                </td>
                <td>
                  <Badge value={s.status} />
                </td>
                <td>
                  <button
                    type="button"
                    className={`adm-btn small ${s.status === 'pending' ? 'primary' : ''}`}
                    onClick={() => onOpenSupport(s)}
                  >
                    <MessageSquare size={14} />
                    {s.status === 'resolved' ? 'Xem hội thoại' : 'Mở hội thoại'}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination
          page={currentPage}
          totalItems={rows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun={noun}
        />
      </section>
    </>
  );
}
