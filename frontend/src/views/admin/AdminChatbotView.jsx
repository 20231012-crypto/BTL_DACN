/**
 * Admin Chatbot Knowledge, Safety Rules & Support Queue View.
 */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  count,
  dateTime,
  fmtDate,
  list,
  searchScore,
} from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminChatbotView({
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
            onClick: () =>
              setFilter(filter === 'unreviewed' ? '' : 'unreviewed'),
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
              onClick: () =>
                setFilter(filter === 'inactive' ? '' : 'inactive'),
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
              value: count(
                all.filter((s) => s.status === 'in_progress').length,
              ),
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
              onClick: () =>
                setFilter(filter === 'resolved' ? '' : 'resolved'),
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

        <FilterChips
          options={chipOptions}
          value={filter}
          onChange={setFilter}
        />

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
                      <small className="adm-source-line">
                        Nguồn: {k.source}
                      </small>
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
                              onClick={() =>
                                onToggleActive('knowledge', k, true)
                              }
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
                Chatbot kiểm tra từ khóa và quy tắc an toàn trước khi trả lời.
                Nội dung có dấu hiệu nguy cấp được ngắt AI và chuyển ngay tới
                dược sĩ.
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
                  <strong>
                    {s.userName || s.customerName || 'Khách hàng'}
                  </strong>
                  <small>
                    {s.userPhone || s.userEmail || `Hội thoại #${s.sessionId}`}
                  </small>
                </td>
                <td className="adm-cell-wrap">
                  <strong>
                    {s.sessionTitle || `Hội thoại #${s.sessionId}`}
                  </strong>
                  <small>
                    {s.message || s.reason || 'Cần dược sĩ hỗ trợ'}
                  </small>
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
                    {s.status === 'resolved'
                      ? 'Xem hội thoại'
                      : 'Mở hội thoại'}
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
