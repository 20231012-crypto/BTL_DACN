/**
 * Two-way Multi-Thread Pharmacist Consultation View powered by usePharmacistChatController.
 * Supports multiple conversations per customer account; closed conversations become read-only
 * and require starting a new conversation.
 */
import React from 'react';
import {
  CheckCircle2,
  Clock,
  Headphones,
  Lock,
  MessageSquarePlus,
  Send,
} from 'lucide-react';
import { dateTime } from '../../models/formatters.js';
import { usePharmacistChatController } from '../../controllers/usePharmacistChatController.js';

export default function PharmacistChat({ prescription = null }) {
  const c = usePharmacistChatController(prescription);

  const threadStatusBadge = (t) => {
    if (t.closed || t.status === 'resolved')
      return (
        <span className="consult-badge is-closed">
          <Lock size={11} /> Đã kết thúc
        </span>
      );
    if (t.status === 'in_progress')
      return (
        <span className="consult-badge is-active">
          <CheckCircle2 size={11} /> Đang tư vấn
        </span>
      );
    return (
      <span className="consult-badge is-pending">
        <Clock size={11} /> Chờ tiếp nhận
      </span>
    );
  };

  return (
    <div className="pharmacist-chat-shell">
      <aside
        className="pharmacist-threads"
        aria-label="Danh sách cuộc trò chuyện với dược sĩ"
      >
        <div className="pharmacist-threads-head">
          <strong>Cuộc trò chuyện ({c.threads.length})</strong>
          <button
            type="button"
            className="btn btn-primary small"
            onClick={c.startNewThread}
          >
            <MessageSquarePlus size={14} /> Tạo mới
          </button>
        </div>
        <div className="pharmacist-threads-list">
          {!c.loading && c.threads.length === 0 && (
            <p className="muted small pharmacist-threads-empty">
              Chưa có cuộc trò chuyện nào. Hãy gửi câu hỏi đầu tiên cho dược sĩ.
            </p>
          )}
          {c.threads.map((t) => {
            const active = !c.isNewMode && c.consultation?.id === t.id;
            return (
              <button
                type="button"
                key={t.id}
                className={`pharmacist-thread-item ${active ? 'is-selected' : ''} ${t.closed || t.status === 'resolved' ? 'is-closed' : ''}`}
                onClick={() => c.selectThread(t)}
              >
                <div className="pharmacist-thread-top">
                  <strong>{t.title}</strong>
                  {threadStatusBadge(t)}
                </div>
                {t.lastMessage && (
                  <p className="pharmacist-thread-preview">{t.lastMessage}</p>
                )}
                <small>{dateTime(t.lastMessageAt || t.updatedAt || t.createdAt)}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="pharmacist-chat">
        <div className="pharmacist-chat-status" role="status">
          <Headphones size={16} />
          <span>{c.statusLabel}</span>
        </div>
        <div
          className="pharmacist-chat-messages"
          ref={c.boxRef}
          aria-live="polite"
          aria-label="Nội dung tư vấn với dược sĩ"
        >
          {c.loadingMessages && (
            <p className="muted small">Đang tải lịch sử cuộc trò chuyện…</p>
          )}
          {!c.loading && !c.loadingMessages && c.messages.length === 0 && (
            <p className="muted small">
              {prescription
                ? 'Đơn thuốc của bạn sẽ được gửi kèm để dược sĩ xem. Hãy cho dược sĩ biết bạn cần hỗ trợ điều gì.'
                : 'Hãy mô tả điều bạn cần: tìm thuốc theo đơn, thuốc thay thế, cách dùng hoặc thắc mắc khác.'}
            </p>
          )}
          {c.messages.map((message) => {
            const mine = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`pharmacist-bubble ${mine ? 'mine' : 'theirs'}`}
              >
                {!mine && (
                  <strong>
                    {message.mode === 'pharmacist'
                      ? c.consultation?.handlerName || 'Dược sĩ'
                      : 'An Tâm'}
                  </strong>
                )}
                <p>{message.content}</p>
                <time>{dateTime(message.createdAt)}</time>
              </div>
            );
          })}
        </div>
        {c.error && (
          <p role="alert" className="error-box">
            {c.error}
          </p>
        )}

        {!c.isNewMode && c.isClosed ? (
          <div className="pharmacist-closed-banner">
            <div>
              <strong>
                <Lock size={15} /> Cuộc trò chuyện này đã kết thúc
              </strong>
              <p>
                Dược sĩ đã đóng cuộc tư vấn này nên không thể gửi thêm tin nhắn.
                Hãy mở cuộc trò chuyện mới để tiếp tục trao đổi.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={c.startNewThread}
            >
              <MessageSquarePlus size={16} /> Mở cuộc trò chuyện mới
            </button>
          </div>
        ) : (
          <form className="pharmacist-chat-form-wrap" onSubmit={c.send}>
            {c.isNewMode && !prescription && (
              <input
                type="text"
                className="pharmacist-topic-input"
                value={c.topic}
                onChange={(e) => c.setTopic(e.target.value)}
                placeholder="Chủ đề cuộc trò chuyện (tùy chọn, VD: Tư vấn bổ sung vitamin…)"
                maxLength={70}
              />
            )}
            <div className="pharmacist-chat-form">
              <textarea
                value={c.draft}
                onChange={(event) => c.setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) c.send(event);
                }}
                placeholder="Nhập câu hỏi cho dược sĩ…"
                aria-label="Tin nhắn gửi dược sĩ"
                maxLength={2000}
                rows={2}
              />
              <button
                className="btn btn-primary"
                disabled={c.sending || !c.draft.trim() || c.loading}
              >
                <Send size={15} /> Gửi
              </button>
            </div>
          </form>
        )}

        <p className="small muted">
          Dược sĩ tư vấn thông tin và hỗ trợ chọn sản phẩm, không thay thế bác sĩ.
          Khi có dấu hiệu nguy hiểm, hãy đến cơ sở y tế gần nhất.
        </p>
      </div>
    </div>
  );
}
