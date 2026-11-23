/**
 * Chat Model: AI assistant sessions, guest message persistence, and two-way pharmacist consultations.
 */
import { api } from './httpClient.js';

export const GUEST_CHAT_STORAGE_KEY = 'antam_chat_guest';
export const CONSULTATION_TITLE = 'Tư vấn dược sĩ';

export const getChatSessionStorageKey = (user) =>
  user ? `antam_chat_session_${user.id}` : GUEST_CHAT_STORAGE_KEY;

export const loadGuestChatMessages = () => {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(GUEST_CHAT_STORAGE_KEY) || '[]',
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const saveGuestChatMessages = (messages) => {
  try {
    sessionStorage.setItem(
      GUEST_CHAT_STORAGE_KEY,
      JSON.stringify(messages.slice(-30)),
    );
  } catch {
    // Ignore storage quota errors.
  }
};

export const readSavedChatSessionId = (storageKey) => {
  try {
    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

export const writeSavedChatSessionId = (storageKey, value) => {
  try {
    sessionStorage.setItem(storageKey, String(value));
  } catch {
    // Ignore storage quota errors.
  }
};

export const fetchChatSessions = async () => {
  const data = await api('/chat/sessions');
  return Array.isArray(data) ? data : [];
};

export const fetchChatSessionMessages = async (sessionId) => {
  const data = await api(`/chat/sessions/${sessionId}/messages`);
  return (Array.isArray(data) ? data : data.messages || []).map((m) => ({
    ...m,
    content: m.content || m.message || m.text,
  }));
};

export const sendChatMessage = (sessionId, message) =>
  api('/chat', {
    method: 'POST',
    body: { ...(sessionId ? { sessionId } : {}), message },
  });

export const mergeMessages = (previous, incoming) => {
  if (!incoming.length) return previous;
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
};

export const consultationStatusText = (consultation) => {
  if (!consultation) return 'Gửi câu hỏi để dược sĩ nhận tư vấn cho bạn.';
  if (consultation.status === 'resolved')
    return 'Dược sĩ đã kết thúc tư vấn. Bạn nhắn tiếp để mở lại cuộc trò chuyện.';
  if (consultation.status === 'in_progress')
    return `${consultation.handlerName || 'Dược sĩ'} đang tư vấn cho bạn.`;
  return 'Đang chờ dược sĩ nhận cuộc tư vấn. Bạn có thể nhắn thêm thông tin trong lúc chờ.';
};

export const fetchConsultations = () => api('/consultations');

export const fetchConsultationMessages = (id, after = 0) =>
  api(`/consultations/${id}/messages?after=${after}`);

export const createConsultation = (message, prescriptionId) =>
  api('/consultations', {
    method: 'POST',
    body: { message, prescriptionId },
  });

export const sendConsultationMessage = (id, message) =>
  api(`/consultations/${id}/messages`, {
    method: 'POST',
    body: { message },
  });
