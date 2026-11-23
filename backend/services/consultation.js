import { camel, now } from '../repositories/database.js';
import { assert, audit, positiveInt, text } from './shared.js';

// Cuộc tư vấn với dược sĩ dùng lại bảng cuoc_hoi_thoai, tin_nhan và yeu_cau_ho_tro.
// Tiêu đề bắt đầu bằng TITLE để phân biệt với hội thoại của trợ lý ảo.
export const CONSULTATION_TITLE = 'Tư vấn dược sĩ';
const titleFor = (prescriptionId, topic = '', fallbackMessage = '') => {
  if (prescriptionId) return `${CONSULTATION_TITLE} · Đơn thuốc #${prescriptionId}`;
  const cleanTopic = text(topic, 70);
  if (cleanTopic) return `${CONSULTATION_TITLE} · ${cleanTopic}`;
  const snippet = text(fallbackMessage, 48);
  if (snippet)
    return `${CONSULTATION_TITLE} · ${snippet}${fallbackMessage.trim().length > 48 ? '…' : ''}`;
  return CONSULTATION_TITLE;
};

const consultationSql = `SELECT s.id,s.title,s.status session_status,s.created_at,s.updated_at,h.id support_id,h.status,h.handler_id,u.name handler_name,
  (SELECT COUNT(*) FROM tin_nhan m WHERE m.session_id=s.id) message_count,
  (SELECT m.content FROM tin_nhan m WHERE m.session_id=s.id ORDER BY m.id DESC LIMIT 1) last_message,
  (SELECT m.created_at FROM tin_nhan m WHERE m.session_id=s.id ORDER BY m.id DESC LIMIT 1) last_message_at
  FROM cuoc_hoi_thoai s
  JOIN yeu_cau_ho_tro h ON h.session_id=s.id
  LEFT JOIN nguoi_dung u ON u.id=h.handler_id`;

const formatConsultation = (row) => {
  const data = camel(row);
  return {
    ...data,
    messageCount: Number(data.messageCount || 0),
    closed: data.status === 'resolved' || data.sessionStatus === 'closed',
  };
};

export function installConsultation(app, d, { auth, permission }) {
  const owned = async (id, userId) => {
    const row = await d.one(
      `${consultationSql} WHERE s.id=? AND s.user_id=? AND s.title LIKE ? ORDER BY h.id DESC LIMIT 1`,
      Number(id),
      userId,
      `${CONSULTATION_TITLE}%`,
    );
    assert(row, 404, 'Không tìm thấy cuộc tư vấn.');
    return row;
  };
  const appendUserMessage = async (consultation, content) => {
    assert(
      consultation.status !== 'resolved' && consultation.session_status !== 'closed',
      409,
      'Cuộc trò chuyện này đã được dược sĩ kết thúc và đóng. Vui lòng tạo cuộc trò chuyện mới để tiếp tục trao đổi.',
    );
    const id = await d.insert('tin_nhan', {
      session_id: consultation.id,
      role: 'user',
      content,
      mode: 'user',
    });
    await d.update(
      'yeu_cau_ho_tro',
      {
        status: consultation.status,
        updated_at: now(),
      },
      consultation.support_id,
    );
    await d.update(
      'cuoc_hoi_thoai',
      { status: 'handoff', updated_at: now() },
      consultation.id,
    );
    return camel(await d.one('SELECT * FROM tin_nhan WHERE id=?', id));
  };

  app.get('/api/consultations', auth, async (req, res) => {
    const rows = await d.all(
      `${consultationSql} WHERE s.user_id=? AND s.title LIKE ? ORDER BY s.updated_at DESC, s.id DESC`,
      req.user.id,
      `${CONSULTATION_TITLE}%`,
    );
    res.json({ data: rows.map(formatConsultation) });
  });

  app.post('/api/consultations', auth, async (req, res) => {
    const message = text(req.body?.message, 2000);
    assert(message.length >= 2, 400, 'Hãy nhập nội dung cần tư vấn (ít nhất 2 ký tự).');
    const prescriptionId = req.body?.prescriptionId
      ? positiveInt(req.body.prescriptionId)
      : null;
    assert(
      !req.body?.prescriptionId || prescriptionId,
      400,
      'Mã đơn thuốc không hợp lệ.',
    );
    if (prescriptionId)
      assert(
        await d.one(
          'SELECT id FROM don_thuoc WHERE id=? AND user_id=?',
          prescriptionId,
          req.user.id,
        ),
        404,
        'Không tìm thấy đơn thuốc của bạn.',
      );
    const title = titleFor(prescriptionId, req.body?.title, message);
    const created = await d.transaction(async () => {
      const sessionId = await d.insert('cuoc_hoi_thoai', {
        user_id: req.user.id,
        title,
        status: 'handoff',
        created_at: now(),
        updated_at: now(),
      });
      const supportId = await d.insert('yeu_cau_ho_tro', {
        session_id: sessionId,
        user_id: req.user.id,
        message,
        created_at: now(),
        updated_at: now(),
      });
      await audit(d, req.user.id, 'consultation.create', 'support', supportId);
      const consultation = await d.one(
        `${consultationSql} WHERE s.id=? ORDER BY h.id DESC LIMIT 1`,
        sessionId,
      );
      const first = await appendUserMessage(consultation, message);
      const updated = await d.one(
        `${consultationSql} WHERE s.id=? ORDER BY h.id DESC LIMIT 1`,
        sessionId,
      );
      return { consultation: updated, first };
    });
    res.status(201).json({
      data: {
        consultation: formatConsultation(created.consultation),
        message: created.first,
      },
    });
  });

  app.get('/api/consultations/:id/messages', auth, async (req, res) => {
    const consultation = await owned(req.params.id, req.user.id);
    const after = Number(req.query.after) || 0;
    const messages = await d.all(
      'SELECT * FROM tin_nhan WHERE session_id=? AND id>? ORDER BY id',
      consultation.id,
      after,
    );
    res.json({
      data: {
        consultation: formatConsultation(consultation),
        messages: messages.map(camel),
      },
    });
  });

  app.post('/api/consultations/:id/messages', auth, async (req, res) => {
    const consultation = await owned(req.params.id, req.user.id);
    const message = text(req.body?.message, 2000);
    assert(message.length >= 1, 400, 'Hãy nhập nội dung tin nhắn.');
    const saved = await appendUserMessage(consultation, message);
    res.status(201).json({ data: saved });
  });

  // Dược sĩ/nhân viên có quyền hỗ trợ nhắn trực tiếp trong cuộc tư vấn.
  app.post(
    '/api/admin/support/:id/messages',
    permission('support'),
    async (req, res) => {
      const support = await d.one(
        'SELECT * FROM yeu_cau_ho_tro WHERE id=?',
        req.params.id,
      );
      assert(support, 404, 'Không tìm thấy yêu cầu.');
      assert(
        support.status !== 'resolved',
        409,
        'Cuộc trò chuyện này đã kết thúc và đóng. Không thể gửi thêm tin nhắn.',
      );
      const message = text(req.body?.message, 5000);
      assert(message.length >= 1, 400, 'Hãy nhập nội dung tin nhắn.');
      const id = await d.insert('tin_nhan', {
        session_id: support.session_id,
        role: 'assistant',
        content: message,
        mode: 'pharmacist',
      });
      await d.update(
        'yeu_cau_ho_tro',
        { status: 'in_progress', handler_id: req.user.id, updated_at: now() },
        support.id,
      );
      await d.update(
        'cuoc_hoi_thoai',
        { status: 'handoff', updated_at: now() },
        support.session_id,
      );
      await audit(d, req.user.id, 'support.message', 'support', support.id);
      res.status(201).json({
        data: camel(await d.one('SELECT * FROM tin_nhan WHERE id=?', id)),
      });
    },
  );
}
