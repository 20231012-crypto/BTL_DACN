/**
 * Two-way Pharmacist Consultation Chat View powered by usePharmacistChatController.
 */
import React from 'react';
import { Headphones, Send } from 'lucide-react';
import { dateTime } from '../../models/formatters.js';
import { usePharmacistChatController } from '../../controllers/usePharmacistChatController.js';

export default function PharmacistChat({ prescription = null }) {
  const c = usePharmacistChatController(prescription);

  return (
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
        {!c.loading && c.messages.length === 0 && (
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
      <form className="pharmacist-chat-form" onSubmit={c.send}>
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
      </form>
      <p className="small muted">
        Dược sĩ tư vấn thông tin và hỗ trợ chọn sản phẩm, không thay thế bác sĩ.
        Khi có dấu hiệu nguy hiểm, hãy đến cơ sở y tế gần nhất.
      </p>
    </div>
  );
}
