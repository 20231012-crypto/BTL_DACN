/**
 * Chat Controller: orchestrates AI assistant conversation, session history, guest storage, and pharmacist handoff.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchChatSessionMessages,
  fetchChatSessions,
  getChatSessionStorageKey,
  loadGuestChatMessages,
  readSavedChatSessionId,
  saveGuestChatMessages,
  sendChatMessage,
  writeSavedChatSessionId,
} from '../models/chatModel.js';
import { useApp } from './AppContext.jsx';

export function useChatController({ onClose, full = false }) {
  const { user, notify, config, navigate } = useApp();
  const storageKey = getChatSessionStorageKey(user);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState(() =>
    user ? [] : loadGuestChatMessages(),
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(() =>
    config?.geminiConfigured ? 'gemini' : 'knowledge',
  );
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const initializedRef = useRef(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (!messages.length && config?.geminiConfigured) {
      setMode('gemini');
    }
  }, [config?.geminiConfigured, messages.length]);

  const openSession = useCallback(
    async (id) => {
      try {
        const loaded = await fetchChatSessionMessages(id);
        setSessionId(id);
        setMessages(loaded);
        const lastAssistant = [...loaded]
          .reverse()
          .find((m) => m.role === 'assistant' && m.mode);
        setMode(lastAssistant?.mode || 'knowledge');
        setShowHistory(false);
        writeSavedChatSessionId(storageKey, id);
      } catch (e) {
        notify(e.message, 'error');
      }
    },
    [notify, storageKey],
  );

  useEffect(() => {
    initializedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setSessionId(null);
      return undefined;
    }
    let cancelled = false;
    fetchChatSessions()
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        if (!initializedRef.current) {
          initializedRef.current = true;
          const savedId = readSavedChatSessionId(storageKey);
          if (savedId === 'new') return;
          const target =
            (savedId && list.find((s) => String(s.id) === savedId)) || list[0];
          if (target) openSession(target.id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, sessionId, storageKey, openSession]);

  useEffect(() => {
    if (!user) saveGuestChatMessages(messages);
  }, [user, messages]);

  useEffect(() => {
    const box =
      messagesRef.current ||
      document.querySelector(
        full ? '.chat-full .chat-messages' : '.chat-popover .chat-messages',
      );
    box?.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, full]);

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setMode(config?.geminiConfigured ? 'gemini' : 'knowledge');
    setShowHistory(false);
    writeSavedChatSessionId(storageKey, 'new');
  };

  const send = async (text) => {
    if (!text.trim() || busy) return;
    setMessages((old) => [...old, { role: 'user', content: text }]);
    setMessage('');
    setBusy(true);
    try {
      const result = await sendChatMessage(sessionId, text);
      if (result.sessionId) {
        setSessionId(result.sessionId);
        writeSavedChatSessionId(storageKey, result.sessionId);
      }
      setMode(result.mode || 'knowledge');
      setMessages((old) => [
        ...old,
        {
          id: result.id,
          role: 'assistant',
          content: result.reply,
          mode: result.mode,
          products: result.products,
          handoff: result.handoff,
        },
      ]);
    } catch (e) {
      setMessages((old) => [
        ...old,
        { role: 'assistant', content: e.message, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handoff = () => {
    onClose?.();
    navigate(user ? '/consultation' : '/login?next=%2Fconsultation');
  };

  return {
    user,
    config,
    messages,
    message,
    setMessage,
    busy,
    mode,
    sessions,
    showHistory,
    setShowHistory,
    openSession,
    startNewChat,
    send,
    handoff,
    messagesRef,
  };
}
