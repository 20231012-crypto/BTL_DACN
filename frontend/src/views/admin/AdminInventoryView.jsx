/**
 * Admin FEFO Inventory, Expiry Alerts & Stock Movements View.
 */
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Clock,
  Package,
  Pencil,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {
  compactMoney,
  count,
  dateTime,
  daysBetweenIso,
  fmtDate,
  list,
  money,
  searchScore,
  vnDate,
} from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminInventoryView({
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
  const reservedBatchCount = batches.filter(
    (b) => Number(b.reserved) > 0,
  ).length;

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
                          onClick={() =>
                            onOpenReceipt({ productId: a.productId })
                          }
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
                      Vốn:{' '}
                      {money((Number(b.quantity) || 0) * (Number(b.cost) || 0))}
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
