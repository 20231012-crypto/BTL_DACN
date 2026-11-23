/**
 * Pharmacist Chat Controller: polls and manages customer two-way consultations with a pharmacist.
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
    for (const message of incoming) {
      lastId.current = Math.max(lastId.current, message.id);
    }
    setMessages((previous) => mergeMessages(previous, incoming));
  }, []);

  const pull = useCallback(
    async (id) => {
      const data = await fetchConsultationMessages(id, lastId.current);
      setConsultation(data.consultation);
      remember(data.messages);
    },
    [remember],
  );

  useEffect(() => {
    let cancelled = false;
    lastId.current = 0;
    setMessages([]);
    setConsultation(null);
    setError('');
    setLoading(true);
    (async () => {
      try {
        const rows = await fetchConsultations();
        const wanted = prescriptionId
          ? `${CONSULTATION_TITLE} · Đơn thuốc #${prescriptionId}`
          : CONSULTATION_TITLE;
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

  useEffect(() => {
    if (!consultation) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) pull(consultation.id).catch(() => {});
    }, POLL_INTERVAL_MS);
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
        const saved = await sendConsultationMessage(consultation.id, content);
        remember([saved]);
        await pull(consultation.id);
      } else {
        const created = await createConsultation(content, prescriptionId);
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

  return {
    consultation,
    statusLabel: loading
      ? 'Đang tải cuộc tư vấn…'
      : consultationStatusText(consultation),
    messages,
    draft,
    setDraft,
    loading,
    sending,
    error,
    boxRef: box,
    send,
  };
}
