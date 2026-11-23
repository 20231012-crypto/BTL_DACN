/**
 * Pharmacist Chat Controller: manages multiple consultation conversations per customer account.
 * When a pharmacist closes a conversation (status === 'resolved'), it becomes read-only and the customer
 * must start a new conversation thread.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from '../models/constants.js';
import {
  CONSULTATION_TITLE,
  consultationStatusText,
  createConsultation,
  fetchConsultationMessages,
  fetchConsultations,
  mergeMessages,
  sendConsultationMessage,
} from '../models/chatModel.js';

export function usePharmacistChatController(prescription = null) {
  const [threads, setThreads] = useState([]);
  const [consultation, setConsultation] = useState(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastId = useRef(0);
  const box = useRef(null);
  const prescriptionId = prescription?.id || null;

  const isClosed = Boolean(
    consultation &&
      (consultation.closed || consultation.status === 'resolved'),
  );

  const remember = useCallback((incoming) => {
    for (const message of incoming) {
      lastId.current = Math.max(lastId.current, message.id);
    }
    setMessages((previous) => mergeMessages(previous, incoming));
  }, []);

  const syncThreadSummary = useCallback((updated) => {
    if (!updated?.id) return;
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
    });
  }, []);

  const pull = useCallback(
    async (id, { reset = false } = {}) => {
      if (reset) {
        lastId.current = 0;
        setMessages([]);
      }
      const data = await fetchConsultationMessages(id, lastId.current);
      setConsultation(data.consultation);
      syncThreadSummary(data.consultation);
      remember(data.messages || []);
    },
    [remember, syncThreadSummary],
  );

  const loadThreads = useCallback(async () => {
    const rows = await fetchConsultations();
    setThreads(rows);
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    lastId.current = 0;
    setMessages([]);
    setConsultation(null);
    setIsNewMode(false);
    setTopic('');
    setError('');
    setLoading(true);
    (async () => {
      try {
        const rows = await loadThreads();
        if (cancelled) return;
        const rxTitle = prescriptionId
          ? `${CONSULTATION_TITLE} · Đơn thuốc #${prescriptionId}`
          : null;
        const target = rxTitle
          ? rows.find((row) => row.title === rxTitle && !row.closed) ||
            rows.find((row) => row.title === rxTitle)
          : rows.find((row) => !row.closed) || rows[0];
        if (target) {
          await pull(target.id, { reset: true });
        } else {
          setIsNewMode(true);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prescriptionId, loadThreads, pull]);

  useEffect(() => {
    if (!consultation || isNewMode || isClosed) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) pull(consultation.id).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [consultation?.id, isNewMode, isClosed, pull]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const selectThread = async (thread) => {
    if (!thread?.id) return;
    setIsNewMode(false);
    setError('');
    setDraft('');
    setLoadingMessages(true);
    try {
      await pull(thread.id, { reset: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const startNewThread = () => {
    setIsNewMode(true);
    setConsultation(null);
    setMessages([]);
    lastId.current = 0;
    setTopic('');
    setDraft('');
    setError('');
  };

  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    if (!isNewMode && isClosed) {
      setError(
        'Cuộc trò chuyện này đã được dược sĩ kết thúc. Vui lòng mở cuộc trò chuyện mới.',
      );
      return;
    }
    setSending(true);
    setError('');
    try {
      if (consultation && !isNewMode) {
        const saved = await sendConsultationMessage(consultation.id, content);
        remember([saved]);
        await pull(consultation.id);
      } else {
        const created = await createConsultation(
          content,
          prescriptionId,
          topic.trim(),
        );
        setIsNewMode(false);
        setTopic('');
        setConsultation(created.consultation);
        lastId.current = 0;
        setMessages([]);
        remember([created.message]);
        await loadThreads();
      }
      setDraft('');
    } catch (e) {
      setError(e.message);
      if (consultation?.id && /kết thúc|đóng/i.test(e.message)) {
        await pull(consultation.id).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  return {
    threads,
    consultation,
    isNewMode,
    isClosed,
    topic,
    setTopic,
    statusLabel: loading
      ? 'Đang tải cuộc tư vấn…'
      : isNewMode
        ? 'Bắt đầu cuộc trò chuyện mới với dược sĩ An Tâm.'
        : consultationStatusText(consultation),
    messages,
    draft,
    setDraft,
    loading,
    loadingMessages,
    sending,
    error,
    boxRef: box,
    selectThread,
    startNewThread,
    send,
  };
}
