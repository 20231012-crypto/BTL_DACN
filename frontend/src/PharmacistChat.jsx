import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Send } from 'lucide-react';
import { api, dateTime } from './lib.js';

const POLL_MS = 5000;
const TITLE = 'Tư vấn dược sĩ';

const statusText = (consultation) => {
  if (!consultation) return 'Gửi câu hỏi để dược sĩ nhận tư vấn cho bạn.';
  if (consultation.status === 'resolved')
    return 'Dược sĩ đã kết thúc tư vấn. Bạn nhắn tiếp để mở lại cuộc trò chuyện.';
  if (consultation.status === 'in_progress')
    return `${consultation.handlerName || 'Dược sĩ'} đang tư vấn cho bạn.`;
  return 'Đang chờ dược sĩ nhận cuộc tư vấn. Bạn có thể nhắn thêm thông tin trong lúc chờ.';
};

const mergeMessages = (previous, incoming) => {
  if (!incoming.length) return previous;
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
};

// Trò chuyện hai chiều với dược sĩ. `prescription` là đơn thuốc đã tải lên (nếu có)
// để dược sĩ biết đang tư vấn cho đơn nào.
export default function PharmacistChat({ prescription = null }) {
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastId = useRef(0);
  const box = useRef(null);
  const prescriptionId = prescription?.id || null;

  const remember = useCallback((incoming) => {
    for (const message of incoming)
      lastId.current = Math.max(lastId.current, message.id);
    setMessages((previous) => mergeMessages(previous, incoming));
  }, []);

  const pull = useCallback(
    async (id) => {
      const data = await api(
        `/consultations/${id}/messages?after=${lastId.current}`,
      );
      setConsultation(data.consultation);
      remember(data.messages);
    },
    [remember],
  );

  // Tìm cuộc tư vấn đã có cho đúng đơn thuốc (hoặc cuộc tư vấn chung).
  useEffect(() => {
    let cancelled = false;
    lastId.current = 0;
    setMessages([]);
    setConsultation(null);
    setError('');
    setLoading(true);
    (async () => {
      try {
        const rows = await api('/consultations');
        const wanted = prescriptionId
          ? `${TITLE} · Đơn thuốc #${prescriptionId}`
          : TITLE;
        const found = rows.find((row) => row.title === wanted);
        if (found && !cancelled) await pull(found.id);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prescriptionId, pull]);

  // Hỏi tin nhắn mới theo chu kỳ khi cuộc tư vấn đang mở và tab đang hiển thị.
  useEffect(() => {
    if (!consultation) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) pull(consultation.id).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [consultation?.id, pull]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      if (consultation) {
        const saved = await api(`/consultations/${consultation.id}/messages`, {
          method: 'POST',
          body: { message: content },
        });
        remember([saved]);
        await pull(consultation.id);
      } else {
        const created = await api('/consultations', {
          method: 'POST',
          body: { message: content, prescriptionId },
        });
        setConsultation(created.consultation);
        remember([created.message]);
      }
      setDraft('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pharmacist-chat">
      <div className="pharmacist-chat-status" role="status">
        <Headphones size={16} />
        <span>{loading ? 'Đang tải cuộc tư vấn…' : statusText(consultation)}</span>
      </div>
      <div
        className="pharmacist-chat-messages"
        ref={box}
        aria-live="polite"
        aria-label="Nội dung tư vấn với dược sĩ"
      >
        {!loading && messages.length === 0 && (
          <p className="muted small">
            {prescription
              ? 'Đơn thuốc của bạn sẽ được gửi kèm để dược sĩ xem. Hãy cho dược sĩ biết bạn cần hỗ trợ điều gì.'
              : 'Hãy mô tả điều bạn cần: tìm thuốc theo đơn, thuốc thay thế, cách dùng hoặc thắc mắc khác.'}
          </p>
        )}
        {messages.map((message) => {
          const mine = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`pharmacist-bubble ${mine ? 'mine' : 'theirs'}`}
            >
              {!mine && (
                <strong>
                  {message.mode === 'pharmacist'
                    ? consultation?.handlerName || 'Dược sĩ'
                    : 'An Tâm'}
                </strong>
              )}
              <p>{message.content}</p>
              <time>{dateTime(message.createdAt)}</time>
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <form className="pharmacist-chat-form" onSubmit={send}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) send(event);
          }}
          placeholder="Nhập câu hỏi cho dược sĩ…"
          aria-label="Tin nhắn gửi dược sĩ"
          maxLength={2000}
          rows={2}
        />
        <button
          className="btn btn-primary"
          disabled={sending || !draft.trim() || loading}
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
