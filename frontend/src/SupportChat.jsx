import { useCallback, useEffect, useRef, useState } from 'react';
import { api, dateTime, money } from './lib.js';

const POLL_MS = 5000;
const CLOSING_NOTE =
  'Cuộc tư vấn đã kết thúc. Nếu cần hỗ trợ thêm, bạn cứ nhắn tiếp tại đây nhé.';
const STATUS_TEXT = {
  pending: 'Chờ nhận tư vấn',
  in_progress: 'Đang tư vấn',
  resolved: 'Đã kết thúc',
};
const QUICK_REPLIES = [
  'Dược sĩ đã tiếp nhận yêu cầu. Bạn vui lòng mô tả rõ triệu chứng, độ tuổi và thuốc đang dùng nhé.',
  'Với thuốc kê đơn, bạn cần tải ảnh đơn thuốc hợp lệ để dược sĩ đối chiếu trước khi xuất thuốc.',
  'Nếu có dấu hiệu khó thở, sốt cao không hạ hoặc dị ứng, bạn cần ngưng thuốc và tới cơ sở y tế gần nhất ngay.',
];

const mergeMessages = (previous, incoming) => {
  if (!incoming.length) return previous;
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
};

// Màn hình tư vấn trực tiếp của dược sĩ/nhân viên với khách hàng.
export default function SupportChat({ item, onChanged, notify }) {
  const [messages, setMessages] = useState(() =>
    mergeMessages([], item.messages || []),
  );
  const [status, setStatus] = useState(item.status);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const lastId = useRef(messages.at(-1)?.id || 0);
  const box = useRef(null);
  const prescriptionId = /Đơn thuốc #(\d+)/.exec(item.sessionTitle || '')?.[1];

  useEffect(() => {
    const initial = mergeMessages([], item.messages || []);
    setMessages(initial);
    setStatus(item.status);
    setDraft('');
    lastId.current = initial.at(-1)?.id || 0;
  }, [item.id]);

  const remember = useCallback((incoming) => {
    for (const message of incoming)
      lastId.current = Math.max(lastId.current, message.id);
    setMessages((previous) => mergeMessages(previous, incoming));
  }, []);

  const pull = useCallback(async () => {
    const incoming = await api(
      `/admin/support/${item.id}/messages?after=${lastId.current}`,
    );
    const list = Array.isArray(incoming) ? incoming : [];
    remember(list);
    if (list.some((message) => message.role === 'user')) {
      setStatus((prev) => {
        if (prev === 'resolved') {
          onChanged?.();
          return 'pending';
        }
        return prev;
      });
    }
    return list;
  }, [item.id, remember, onChanged]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) pull().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pull]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (event) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const saved = await api(`/admin/support/${item.id}/messages`, {
        method: 'POST',
        body: { message: content },
      });
      remember([saved]);
      setStatus('in_progress');
      setDraft('');
      onChanged?.();
    } catch (error) {
      notify?.(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/support/${item.id}`, {
        method: 'PATCH',
        body: { status: 'resolved', reply: draft.trim() || CLOSING_NOTE },
      });
      setDraft('');
      setStatus('resolved');
      await pull();
      notify?.('Đã kết thúc cuộc tư vấn.');
      onChanged?.();
    } catch (error) {
      notify?.(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal-body adm-support-chat">
      <div className="adm-support-head">
        <div>
          <strong>{item.userName || 'Khách hàng'}</strong>
          <small>Yêu cầu lúc {dateTime(item.createdAt)}</small>
        </div>
        <span className={`adm-support-status ${status}`}>
          {STATUS_TEXT[status] || status}
        </span>
        {prescriptionId && (
          <a
            className="adm-btn small"
            href={`/api/prescriptions/${prescriptionId}/file`}
            target="_blank"
            rel="noreferrer"
          >
            Xem đơn thuốc #{prescriptionId}
          </a>
        )}
      </div>
      <div className="adm-conversation adm-chat-box" ref={box} aria-live="polite">
        {messages.map((message) => (
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
      <form className="adm-chat-form" onSubmit={send}>
        <div className="adm-quick-notes">
          <span>Mẫu tư vấn nhanh:</span>
          {QUICK_REPLIES.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              className="adm-quick-chip"
              onClick={() =>
                setDraft((prev) => (prev ? `${prev} ${tpl}` : tpl))
              }
            >
              Mẫu #{idx + 1}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) send(event);
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
            onClick={finish}
            disabled={busy || status === 'resolved'}
          >
            Kết thúc tư vấn
          </button>
          <button className="adm-btn primary" disabled={busy || !draft.trim()}>
            Gửi tin nhắn
          </button>
        </div>
      </form>
    </div>
  );
}
