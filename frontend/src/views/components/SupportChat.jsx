/**
 * Admin Support Chat Modal Content View powered by useSupportChatController.
 */
import React from 'react';
import {
  SUPPORT_QUICK_REPLIES,
  SUPPORT_STATUS_TEXT,
} from '../../models/constants.js';
import { dateTime, money } from '../../models/formatters.js';
import { useSupportChatController } from '../../controllers/useSupportChatController.js';

export default function SupportChat({ item, onChanged, notify }) {
  const c = useSupportChatController({ item, onChanged, notify });

  return (
    <div className="adm-modal-body adm-support-chat">
      <div className="adm-support-head">
        <div>
          <strong>{item.userName || 'Khách hàng'}</strong>
          <small>Yêu cầu lúc {dateTime(item.createdAt)}</small>
        </div>
        <span className={`adm-support-status ${c.status}`}>
          {SUPPORT_STATUS_TEXT[c.status] || c.status}
        </span>
        {c.prescriptionId && (
          <a
            className="adm-btn small"
            href={`/api/prescriptions/${c.prescriptionId}/file`}
            target="_blank"
            rel="noreferrer"
          >
            Xem đơn thuốc #{c.prescriptionId}
          </a>
        )}
      </div>
      <div
        className="adm-conversation adm-chat-box"
        ref={c.boxRef}
        aria-live="polite"
      >
        {c.messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'from-user' : ''}
          >
            <strong>
              {message.role === 'user'
                ? item.userName || 'Khách hàng'
                : message.mode === 'pharmacist'
                  ? 'Dược sĩ/nhân viên'
                  : 'Trợ lý An Tâm'}
            </strong>
            <p>{message.content}</p>
            {Array.isArray(message.products) && message.products.length > 0 && (
              <div className="adm-chat-products">
                {message.products.map((prod) => (
                  <span key={prod.id} className="adm-chat-prod-chip">
                    {prod.name}
                    {prod.price ? ` · ${money(prod.price)}` : ''}
                    {prod.prescriptionRequired ? ' (Kê đơn)' : ''}
                  </span>
                ))}
              </div>
            )}
            <small>{dateTime(message.createdAt)}</small>
          </div>
        ))}
      </div>
      {c.status === 'resolved' ? (
        <div className="adm-inline-note adm-support-closed-note">
          <strong>Cuộc tư vấn này đã kết thúc và đóng.</strong> Khách hàng sẽ
          cần mở cuộc trò chuyện mới nếu có câu hỏi tiếp theo.
        </div>
      ) : (
        <form className="adm-chat-form" onSubmit={c.send}>
          <div className="adm-quick-notes">
            <span>Mẫu tư vấn nhanh:</span>
            {SUPPORT_QUICK_REPLIES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                className="adm-quick-chip"
                onClick={() => c.appendTemplate(tpl)}
              >
                Mẫu #{idx + 1}
              </button>
            ))}
          </div>
          <textarea
            value={c.draft}
            onChange={(event) => c.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) c.send(event);
            }}
            placeholder="Nhập nội dung tư vấn gửi khách hàng…"
            aria-label="Nội dung tư vấn"
            maxLength={5000}
            rows={3}
          />
          <div className="adm-chat-actions">
            <button
              type="button"
              className="adm-btn"
              onClick={c.finish}
              disabled={c.busy}
            >
              Kết thúc tư vấn
            </button>
            <button
              className="adm-btn primary"
              disabled={c.busy || !c.draft.trim()}
            >
              Gửi tin nhắn
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
