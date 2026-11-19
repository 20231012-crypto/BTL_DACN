import { camel, normalize, now } from '../repositories/database.js';
import {
  assert,
  text,
  getSettings,
  productList,
  audit,
  orderView,
} from './shared.js';
import { generateAnswer } from '../integrations/gemini.js';
import { geminiKeys } from '../integrations/gemini-client.js';
import { CONSULTATION_TITLE } from './consultation.js';

const redactPii = (value) =>
  String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?84|0)[\s.-]*\d(?:[\s.-]*\d){8,10}/g, '[so-dien-thoai]')
    .replace(/\b(?:AT|MA)\d[A-Z0-9]{5,}\b/gi, '[ma-don]');

const parseMessageRow = (row) => {
  const { products_json, ...rest } = row;
  let products = [];
  if (products_json) {
    try {
      const parsed = JSON.parse(products_json);
      if (Array.isArray(parsed)) products = parsed;
    } catch {
      products = [];
    }
  }
  return { ...camel(rest), products };
};

export function installChatbot(app, d, { auth }, options) {
  const sessionFor = async (id, userId) => {
    const s = await d.one(
      'SELECT * FROM cuoc_hoi_thoai WHERE id=? AND user_id=? AND title NOT LIKE ?',
      Number(id),
      userId,
      `${CONSULTATION_TITLE}%`,
    );
    assert(s, 404, 'Không tìm thấy cuộc trò chuyện.');
    return s;
  };
  const handoff = async (session, userId, message) => {
    let item = await d.one(
      "SELECT * FROM yeu_cau_ho_tro WHERE session_id=? AND status!='resolved'",
      session.id,
    );
    if (!item) {
      const id = await d.insert('yeu_cau_ho_tro', {
        session_id: session.id,
        user_id: userId,
        message: text(message, 2000) || 'Khách hàng yêu cầu dược sĩ hỗ trợ.',
      });
      item = await d.one('SELECT * FROM yeu_cau_ho_tro WHERE id=?', id);
      await d.update(
        'cuoc_hoi_thoai',
        {
          status: 'handoff',
          updated_at: now(),
        },
        session.id,
      );
    }
    return camel(item);
  };
  app.get('/api/chat/sessions', auth, async (req, res) =>
    res.json({
      data: (
        await d.all(
          'SELECT * FROM cuoc_hoi_thoai WHERE user_id=? AND title NOT LIKE ? ORDER BY updated_at DESC, id DESC',
          req.user.id,
          `${CONSULTATION_TITLE}%`,
        )
      ).map(camel),
    }),
  );
  app.post('/api/chat/sessions', auth, async (req, res) => {
    const rawTitle = text(req.body.title, 100) || 'Cuộc trò chuyện mới';
    const title = rawTitle.startsWith(CONSULTATION_TITLE)
      ? 'Cuộc trò chuyện mới'
      : rawTitle;
    const id = await d.insert('cuoc_hoi_thoai', {
      user_id: req.user.id,
      title,
    });
    res.status(201).json({
      data: camel(await d.one('SELECT * FROM cuoc_hoi_thoai WHERE id=?', id)),
    });
  });
  app.get('/api/chat/sessions/:id/messages', auth, async (req, res) => {
    await sessionFor(req.params.id, req.user.id);
    res.json({
      data: (
        await d.all(
          'SELECT * FROM tin_nhan WHERE session_id=? ORDER BY id',
          req.params.id,
        )
      ).map(parseMessageRow),
    });
  });
  app.post('/api/chat/sessions/:id/handoff', auth, async (req, res) => {
    const session = await sessionFor(req.params.id, req.user.id),
      result = await handoff(session, req.user.id, req.body?.message);
    res.json({ data: result });
  });
  app.post('/api/chat', async (req, res) => {
    const settings = await getSettings(d);
    assert(
      settings.chatbotEnabled,
      503,
      'Chatbot đang tạm dừng. Vui lòng liên hệ nhà thuốc.',
    );
    const message = text(req.body?.message, 2000);
    assert(message.length >= 2, 400, 'Câu hỏi cần ít nhất 2 ký tự.');
    let session = null;
    if (req.user) {
      if (req.body.sessionId)
        session = await sessionFor(req.body.sessionId, req.user.id);
      else {
        const id = await d.insert('cuoc_hoi_thoai', {
          user_id: req.user.id,
          title: message.slice(0, 80),
        });
        session = await d.one('SELECT * FROM cuoc_hoi_thoai WHERE id=?', id);
      }
      await d.insert('tin_nhan', {
        session_id: session.id,
        role: 'user',
        content: message,
        mode: 'user',
      });
      await d.update(
        'cuoc_hoi_thoai',
        {
          updated_at: now(),
        },
        session.id,
      );
    }
    const requestSupport = async () =>
      session
        ? await handoff(session, req.user.id, message)
        : {
            requiresLogin: true,
          };
    const normalized = normalize(message);
    let reply,
      mode = 'knowledge',
      products = [],
      support = null;
    const critical = [
      'kho tho',
      'dau nguc',
      'bat tinh',
      'co giat',
      'phan ve',
      'qua lieu',
      'ngat',
    ];
    const rules = await d.all(
      'SELECT r.*,k.keyword FROM quy_tac_an_toan r JOIN tu_khoa_canh_bao k ON k.rule_id=r.id WHERE r.active=1',
    );
    const rule = rules.find((r) => normalized.includes(normalize(r.keyword)));
    const urgent = critical.some((k) => normalized.includes(k));
    if (urgent || rule) {
      reply =
        (!urgent && rule?.response) ||
        'Dấu hiệu bạn mô tả cần được nhân viên y tế đánh giá khẩn cấp. Hãy đến cơ sở y tế gần nhất hoặc liên hệ cấp cứu tại địa phương. Không chờ tư vấn qua chatbot.';
      mode = 'safety';
      support = await requestSupport();
    } else if (/tu tu|tu hai|tu sat/.test(normalized)) {
      reply =
        'Mình rất tiếc vì bạn đang gặp khó khăn. Hãy ở cạnh một người bạn tin tưởng và đến cơ sở y tế gần nhất nếu bạn có nguy cơ làm tổn thương bản thân.';
      mode = 'safety';
      support = await requestSupport();
    } else if (
      /co thai|mang thai|cho con bu|tre so sinh|di ung|lieu dung|uong may|bao nhieu vien|ke don cho|khang sinh|tuong tac/.test(
        normalized,
      )
    ) {
      reply =
        'Trường hợp này cần dược sĩ hoặc bác sĩ đánh giá trực tiếp. Tôi có thể kết nối bạn với dược sĩ để trao đổi về thuốc và cách sử dụng an toàn. Thông tin chatbot chỉ để tham khảo.';
      mode = 'safety';
      support = await requestSupport();
    } else if (
      /phi giao|phi ship|mien phi.*giao|phi van chuyen/.test(normalized)
    ) {
      reply = `Phí giao hàng hiện là ${settings.shippingFee.toLocaleString('vi-VN')}đ. Đơn có tiền hàng từ ${settings.freeShippingThreshold.toLocaleString('vi-VN')}đ được miễn phí giao. Chi phí hiển thị ở bước đặt hàng.`;
    } else if (
      /mua thuoc ke don|tai (anh |tep )?don thuoc|kiem duyet don thuoc/.test(
        normalized,
      )
    ) {
      reply =
        'Thêm sản phẩm vào giỏ rồi đính kèm đơn thuốc ở bước đặt hàng. Dược sĩ sẽ đối chiếu đơn với sản phẩm trước khi đơn được thanh toán hoặc xác nhận.';
    } else if (
      /theo doi|trang thai don|don hang cua toi|\b(?:at|ma)\d[a-z0-9]{5,}/.test(
        normalized,
      ) &&
      !req.user
    ) {
      reply =
        'Bạn cần đăng nhập để tra cứu đơn hàng và bảo vệ thông tin của mình.';
    } else if (
      /theo doi|trang thai don|don hang cua toi|\b(?:at|ma)\d[a-z0-9]{5,}/.test(
        normalized,
      )
    ) {
      const code = message.match(/(?:AT|MA)[A-Z0-9]{6,}/i)?.[0]?.toUpperCase();
      let order = code
        ? await d.one(
            'SELECT id FROM don_hang WHERE upper(code)=? AND user_id=?',
            code,
            req.user.id,
          )
        : await d.one(
            'SELECT id FROM don_hang WHERE user_id=? ORDER BY id DESC LIMIT 1',
            req.user.id,
          );
      const o = order ? await orderView(d, order.id) : null;
      const labels = {
        pending: 'Chờ xác nhận',
        pending_prescription: 'Chờ dược sĩ duyệt đơn thuốc',
        pending_payment: 'Chờ thanh toán',
        confirmed: 'Đã xác nhận',
        packing: 'Đang đóng gói',
        shipping: 'Đang giao',
        delivery_failed: 'Giao thất bại',
        delivered: 'Đã giao',
        cancelled: 'Đã hủy',
        returned: 'Đã trả hàng',
      };
      reply = o
        ? `Đơn ${o.code} của bạn: ${labels[o.status] || o.status}. Tổng tiền ${o.total.toLocaleString('vi-VN')}đ. Bạn có thể mở Đơn hàng để xem tiến trình và gửi yêu cầu hỗ trợ.`
        : 'Tôi chưa tìm thấy đơn hàng phù hợp trong tài khoản của bạn. Hãy kiểm tra mã đơn tại mục Đơn hàng.';
    } else {
      const knowledge = await d.all(
        'SELECT * FROM tri_thuc_chatbot WHERE active=1 AND reviewed_at IS NOT NULL',
      );
      const matching = knowledge
        .map((k) => ({
          ...k,
          score: k.keywords
            .split(',')
            .filter((w) => w.trim() && normalized.includes(normalize(w.trim())))
            .length,
        }))
        .filter((k) => k.score > 0)
        .sort((a, b) => b.score - a.score);
      const ignoredWords = new Set([
        'thuoc',
        'pham',
        'can',
        'ban',
        'cho',
        'minh',
        'toi',
        'hang',
        'nao',
        'sinh',
        'the',
        'cach',
        'khong',
        'dung',
        'mua',
      ]);
      const words = normalized
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 3 && !ignoredWords.has(word));
      products = (await productList(d))
        .filter(
          (p) =>
            !p.prescriptionRequired &&
            p.stock > 0 &&
            words.some((w) =>
              normalize(`${p.name} ${p.ingredient}`).includes(w),
            ),
        )
        .slice(0, 3);
      let context = matching
        .slice(0, 2)
        .map((k) => k.content)
        .join('\n');
      if (products.length)
        context +=
          '\nSản phẩm mẫu đang có: ' +
          products
            .map((p) => `${p.name}, ${p.unit}, ${p.price}đ, ${p.description}`)
            .join('\n');
      const fallbackReply = context
        ? matching[0]?.content ||
          'Tôi tìm thấy một số sản phẩm phù hợp với từ khóa của bạn. Bạn hãy xem chi tiết và hỏi dược sĩ nếu cần lựa chọn sản phẩm cho tình trạng sức khỏe cụ thể.'
        : 'Tôi có thể giúp tra cứu sản phẩm, chính sách giao hàng, thanh toán và theo dõi đơn hàng. Câu hỏi này cần thêm thông tin hoặc tư vấn chuyên môn. Bạn có thể chọn “Kết nối dược sĩ” để được nhân viên hỗ trợ. Thông tin tại đây chỉ mang tính tham khảo.';
      reply = fallbackReply;

      const canCallGemini =
        geminiKeys().length > 0 &&
        (!options.testing || options.allowProviderInTests);
      if (canCallGemini) {
        const recentHistory = session
          ? (
              await d.all(
                'SELECT role, content FROM tin_nhan WHERE session_id=? ORDER BY id DESC LIMIT 7',
                session.id,
              )
            )
              .slice(1)
              .reverse()
              .map((row) => ({
                role: row.role,
                content: redactPii(row.content),
              }))
          : [];
        try {
          reply = await generateAnswer({
            question: redactPii(message),
            context,
            history: recentHistory,
          });
          mode = 'gemini';
        } catch (err) {
          mode = 'knowledge_fallback';
          await audit(
            d,
            req.user?.id,
            'chatbot.provider_unavailable',
            'session',
            session?.id,
            `Gemini không phản hồi (${err?.message || 'unknown'}); trả lời từ tri thức nội bộ.`,
          );
        }
      }
    }
    const storedProducts = products.map(
      ({ id: pid, name, price, unit, image, prescriptionRequired }) => ({
        id: pid,
        name,
        price,
        unit,
        image,
        prescriptionRequired,
      }),
    );
    const id = session
      ? await d.insert('tin_nhan', {
          session_id: session.id,
          role: 'assistant',
          content: reply,
          mode,
          products_json: storedProducts.length
            ? JSON.stringify(storedProducts)
            : null,
        })
      : null;
    res.json({
      data: {
        id,
        sessionId: session?.id || null,
        reply,
        mode,
        products,
        handoff: support,
        createdAt: now(),
        providerConfigured: geminiKeys().length > 0,
      },
    });
  });
}
