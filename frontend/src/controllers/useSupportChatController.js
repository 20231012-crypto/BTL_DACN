/**
 * Support Chat Controller (Admin): manages live two-way pharmacist support messaging and ticket resolution.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from '../models/constants.js';
import {
  fetchAdminSupportMessages,
  resolveSupportTicket,
  sendSupportReply,
} from '../models/adminModel.js';
import { mergeMessages } from '../models/chatModel.js';

export function useSupportChatController({ item, onChanged, notify }) {
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
    for (const message of incoming) {
      lastId.current = Math.max(lastId.current, message.id);
    }
    setMessages((previous) => mergeMessages(previous, incoming));
  }, []);

  const pull = useCallback(async () => {
    const incoming = await fetchAdminSupportMessages(item.id, lastId.current);
    remember(incoming);
    if (incoming.some((message) => message.role === 'user')) {
      setStatus((prev) => {
        if (prev === 'resolved') {
          onChanged?.();
          return 'pending';
        }
        return prev;
      });
    }
    return incoming;
  }, [item.id, remember, onChanged]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) pull().catch(() => {});
    }, POLL_INTERVAL_MS);
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
      const saved = await sendSupportReply(item.id, content);
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
      await resolveSupportTicket(item.id, draft.trim());
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

  const appendTemplate = (tpl) =>
    setDraft((prev) => (prev ? `${prev} ${tpl}` : tpl));

  return {
    messages,
    status,
    draft,
    setDraft,
    busy,
    boxRef: box,
    prescriptionId,
    send,
    finish,
    appendTemplate,
  };
}
