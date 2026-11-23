import { camel, normalize, now, today } from '../repositories/database.js';
import {
  assert,
  text,
  getSettings,
  productList,
  comboList,
  audit,
  orderView,
} from './shared.js';
import { generateAnswer } from '../integrations/gemini.js';
import { geminiKeys } from '../integrations/gemini-client.js';
import { CONSULTATION_TITLE } from './consultation.js';
import { searchScore } from '../../shared/search.js';

const CHAT_STOP_WORDS = new Set([
  'toi', 'minh', 'ban', 'cho', 'hoi', 'thuoc', 'san', 'pham', 'nha', 'co',
  'nao', 'khong', 'gi', 'gia', 'bao', 'nhieu', 'mua', 'dung', 'can', 'the',
  'cach', 'hang', 'duoc', 'voi', 'va', 'la', 'bi', 'neu', 'nhe', 'em', 'anh',
  'chi', 'tu', 'van', 'xem', 'tim', 'giup', 'nay', 'kia', 'mot', 'nhung',
  'xin', 'chao', 'gioi', 'thieu', 'tam', 've', 'cua', 'cac', 'biet', 'them',
  'tiet', 'vui', 'long', 'lam', 'sao', 'tai', 'khi', 'trong', 'ngoai', 'hay',
  'nhat', 'khach', 'vay', 'nhu', 'de', 'dang', 'coi', 'thu', 'thi', 'luc',
  'tot', 'nen', 'gio', 'ngay', 'qua', 'rat', 'hon', 'cung', 'van', 'sau',
  'truoc', 'moi', 'nua', 'roi', 'chua', 'deu', 'den', 'theo', 'uong',
]);

const extractTokens = (normalizedText) => {
  const raw = normalizedText.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = [];
  for (let idx = 0; idx < raw.length; idx++) {
    const word = raw[idx];
    if (CHAT_STOP_WORDS.has(word)) continue;
    // Gộp "vitamin c", "vitamin d", "vitamin e"... thành cụm để không tạo token 1 ký tự gây khớp nhầm.
    if (
      word === 'vitamin' &&
      raw[idx + 1] &&
      /^[a-z0-9]{1,3}$/.test(raw[idx + 1])
    ) {
      tokens.push(`vitamin ${raw[idx + 1]}`);
      idx++;
      continue;
    }
    if (word.length >= 3 || /\d/.test(word)) {
      tokens.push(word);
    }
  }
  return [...new Set(tokens)];
};

const containsWordToken = (haystack, token) => {
  if (!token) return false;
  if (token.includes(' ') || token.length >= 4) return haystack.includes(token);
  return new RegExp(`(?:^|[^a-z0-9])${token}(?:$|[^a-z0-9])`).test(haystack);
};

const scoreProductForChat = (product, query, tokens) => {
  const primary = `${product.name} ${product.ingredient || ''} ${product.categoryName || ''}`;
  const secondary = `${product.usage || ''} ${product.description || ''} ${product.manufacturer || ''}`;
  let score = Math.max(
    searchScore(primary, query) * 2,
    searchScore(secondary, query),
  );
  const pNorm = normalize(primary);
  const sNorm = normalize(secondary);
  for (const token of tokens) {
    if (containsWordToken(pNorm, token)) score += 35;
    else if (containsWordToken(sNorm, token)) score += 16;
  }
  return score;
};

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
    const extraGeminiKeys =
      typeof settings.geminiApiKey === 'string' && settings.geminiApiKey.trim()
        ? [settings.geminiApiKey.trim()]
        : [];
    const availableGeminiKeys = geminiKeys(extraGeminiKeys);
    const canCallGemini =
      availableGeminiKeys.length > 0 &&
      (!options.testing || options.allowProviderInTests);

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
      const isShippingQuery =
        /phi giao|phi ship|mien phi.*giao|phi van chuyen/.test(normalized);
      const isRxProcessQuery =
        /mua thuoc ke don|tai (anh |tep )?don thuoc|kiem duyet don thuoc/.test(
          normalized,
        );
      const knowledge = await d.all(
        'SELECT * FROM tri_thuc_chatbot WHERE active=1 AND reviewed_at IS NOT NULL',
      );
      const tokens = extractTokens(normalized);
      const matching = knowledge
        .map((k) => {
          const keywordHits = k.keywords
            .split(',')
            .filter((w) => w.trim() && normalized.includes(normalize(w.trim())))
            .length;
          const titleScore = searchScore(k.title, normalized);
          const contentNorm = normalize(`${k.title} ${k.content}`);
          const tokenHits = tokens.filter(
            (t) => t.length >= 3 && containsWordToken(contentNorm, t),
          ).length;
          return {
            ...k,
            score:
              keywordHits * 40 +
              (titleScore >= 60 ? titleScore : 0) +
              tokenHits * 12,
          };
        })
        .filter((k) => k.score >= 24)
        .sort((a, b) => b.score - a.score);

      const [allProducts, activeCombos, activePromos, categories] =
        await Promise.all([
          productList(d),
          comboList(d, false),
          d.all(
            'SELECT code, name, type, value, min_order, max_discount, apply_scope FROM khuyen_mai WHERE active=1 AND start_date<=? AND end_date>=? AND used_count<usage_limit ORDER BY id DESC LIMIT 6',
            today(),
            today(),
          ),
          d.all('SELECT name FROM danh_muc WHERE active=1 ORDER BY id'),
        ]);
      const otcInStock = allProducts.filter(
        (p) => !p.prescriptionRequired && p.stock > 0,
      );
      const askingCatalog =
        /co (nhung )?(san pham|mat hang|danh muc|thuoc) nao|ban (nhung )?gi|san pham noi bat|goi y san pham/.test(
          normalized,
        );
      if (!isShippingQuery && !isRxProcessQuery && tokens.length) {
        products = otcInStock
          .map((p) => ({
            product: p,
            score: scoreProductForChat(p, normalized, tokens),
          }))
          .filter((row) => row.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((row) => row.product);
      } else if (askingCatalog) {
        products = otcInStock.slice(0, 3);
      }

      const rxMentioned =
        !isShippingQuery && !isRxProcessQuery && tokens.length
          ? allProducts
              .filter((p) => p.prescriptionRequired)
              .map((p) => ({
                product: p,
                score: Math.max(
                  searchScore(`${p.name} ${p.ingredient || ''}`, normalized),
                  tokens.some(
                    (t) =>
                      t.length >= 4 &&
                      normalize(`${p.name} ${p.ingredient || ''}`).includes(t),
                  )
                    ? 65
                    : 0,
                ),
              }))
              .filter((row) => row.score >= 60)
              .sort((a, b) => b.score - a.score)
              .slice(0, 2)
              .map((row) => row.product)
          : [];

      const storeFacts = [
        `Cửa hàng: ${settings.storeName}.`,
        `Phí giao hàng tiêu chuẩn: ${settings.shippingFee.toLocaleString('vi-VN')}đ; miễn phí giao cho đơn từ ${settings.freeShippingThreshold.toLocaleString('vi-VN')}đ.`,
        `Quy trình mua thuốc kê đơn: Thêm sản phẩm vào giỏ hàng, đính kèm ảnh/PDF đơn thuốc hợp lệ ở bước đặt hàng hoặc mục Thuốc theo đơn để dược sĩ đối chiếu và phê duyệt trước khi xác nhận/thanh toán.`,
        `Thời hạn tiếp nhận yêu cầu đổi trả: ${settings.returnWindowDays} ngày kể từ khi nhận hàng (thuốc còn nguyên niêm phong theo quy định).`,
        categories.length
          ? `Các danh mục đang bán: ${categories.map((c) => c.name).join(', ')}.`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const comboText = activeCombos.length
        ? activeCombos
            .slice(0, 4)
            .map(
              (c) =>
                `- ${c.name}: Giá combo ${c.price.toLocaleString('vi-VN')}đ (giá gốc ${c.originalPrice.toLocaleString('vi-VN')}đ, tiết kiệm ${c.savings.toLocaleString('vi-VN')}đ) | Gồm: ${c.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')} | Còn ${c.stock} combo`,
            )
            .join('\n')
        : '';

      const promoText = activePromos.length
        ? activePromos
            .map((p) => {
              const scopeLabel =
                p.apply_scope === 'combo'
                  ? 'áp dụng cho Combo'
                  : p.apply_scope === 'product'
                    ? 'áp dụng cho sản phẩm chỉ định'
                    : 'áp dụng toàn đơn';
              const disc =
                p.type === 'percent'
                  ? `giảm ${p.value}%${p.max_discount ? ` (tối đa ${p.max_discount.toLocaleString('vi-VN')}đ)` : ''}`
                  : `giảm ${p.value.toLocaleString('vi-VN')}đ`;
              return `- Mã ${p.code} (${p.name}): ${disc}, tối thiểu ${p.min_order.toLocaleString('vi-VN')}đ (${scopeLabel})`;
            })
            .join('\n')
        : '';

      const knowledgeForContext = matching.length
        ? matching.slice(0, 4)
        : knowledge.slice(0, 5);
      const knowledgeText = knowledgeForContext
        .map((k) => `- ${k.title}: ${k.content}`)
        .join('\n');

      const productText = products.length
        ? products
            .map((p) =>
              [
                `- ${p.name}`,
                `Danh mục: ${p.categoryName || 'Chăm sóc sức khỏe'}`,
                p.ingredient ? `Hoạt chất: ${p.ingredient}` : '',
                `Giá: ${p.price.toLocaleString('vi-VN')}đ / ${p.unit}`,
                `Tồn kho: Còn ${p.stock} ${p.unit}`,
                p.usage ? `Công dụng/hướng dẫn chung: ${p.usage}` : '',
                p.description ? `Mô tả: ${p.description}` : '',
                p.warning ? `Lưu ý: ${p.warning}` : '',
              ]
                .filter(Boolean)
                .join(' | '),
            )
            .join('\n')
        : '';

      const rxText = rxMentioned.length
        ? rxMentioned
            .map(
              (p) =>
                `- ${p.name} (Hoạt chất: ${p.ingredient || 'theo nhãn'} | Giá tham khảo: ${p.price.toLocaleString('vi-VN')}đ / ${p.unit} | THUỐC KÊ ĐƠN: cần ảnh/PDF đơn thuốc hợp lệ và dược sĩ duyệt trước khi bán)`,
            )
            .join('\n')
        : '';

      const contextSections = [
        `[Thông tin nhà thuốc]\n${storeFacts}`,
        knowledgeText ? `[Tri thức đã được dược sĩ rà soát]\n${knowledgeText}` : '',
        productText
          ? `[Sản phẩm không kê đơn đang bán và còn hàng]\n${productText}`
          : '',
        comboText ? `[Combo sản phẩm tiết kiệm]\n${comboText}` : '',
        promoText ? `[Chương trình khuyến mãi/Voucher đang áp dụng]\n${promoText}` : '',
        rxText
          ? `[Sản phẩm kê đơn được nhắc tới - KHÔNG tự gợi ý mua nếu chưa có đơn]\n${rxText}`
          : '',
      ].filter(Boolean);
      const context = contextSections.join('\n\n');

      const fallbackReply = isShippingQuery
        ? `Phí giao hàng hiện là ${settings.shippingFee.toLocaleString('vi-VN')}đ. Đơn có tiền hàng từ ${settings.freeShippingThreshold.toLocaleString('vi-VN')}đ được miễn phí giao. Chi phí hiển thị ở bước đặt hàng.`
        : isRxProcessQuery
          ? 'Thêm sản phẩm vào giỏ rồi đính kèm đơn thuốc ở bước đặt hàng. Dược sĩ sẽ đối chiếu đơn với sản phẩm trước khi đơn được thanh toán hoặc xác nhận.'
          : matching[0]?.content
            ? products.length
              ? `${matching[0].content}\n\nSản phẩm phù hợp đang có:\n${products
                  .map(
                    (p) =>
                      `• ${p.name} — ${p.price.toLocaleString('vi-VN')}đ/${p.unit} (Còn ${p.stock})`,
                  )
                  .join('\n')}`
              : matching[0].content
            : products.length
              ? `An Tâm hiện có các sản phẩm phù hợp sau:\n${products
                  .map(
                    (p) =>
                      `• ${p.name} — ${p.price.toLocaleString('vi-VN')}đ/${p.unit} (Còn ${p.stock})`,
                  )
                  .join('\n')}\n\nBạn có thể bấm vào từng sản phẩm để xem chi tiết hoặc chọn “Kết nối dược sĩ” khi cần tư vấn thêm. Thông tin chỉ mang tính tham khảo.`
              : rxMentioned.length
                ? `${rxMentioned[0].name} là thuốc kê đơn cần đơn thuốc hợp lệ của bác sĩ. Bạn vui lòng chuẩn bị ảnh/PDF đơn thuốc ở mục “Thuốc theo đơn” hoặc bấm “Kết nối dược sĩ” để được kiểm duyệt và hướng dẫn.`
                : 'Tôi có thể giúp tra cứu sản phẩm, combo ưu đãi, mã giảm giá, chính sách giao hàng, thanh toán và theo dõi đơn hàng. Câu hỏi này cần thêm thông tin hoặc tư vấn chuyên môn. Bạn có thể chọn “Kết nối dược sĩ” để được nhân viên hỗ trợ. Thông tin tại đây chỉ mang tính tham khảo.';
      reply = fallbackReply;

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
            apiKeys: extraGeminiKeys,
            modelOverride: settings.geminiModel || '',
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
        providerConfigured: availableGeminiKeys.length > 0,
      },
    });
  });
}
