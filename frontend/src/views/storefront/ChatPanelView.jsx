/**
 * AI Assistant Chat Panel View powered by useChatController.
 */
import React from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Headphones,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { dateTime, money } from '../../models/formatters.js';
import { useChatController } from '../../controllers/useChatController.js';
import Link from '../components/Link.jsx';
import { LogoIcon } from '../components/Logo.jsx';

export default function ChatPanelView({ onClose, full = false }) {
  const c = useChatController({ onClose, full });

  return (
    <section className={`chat-panel ${full ? 'chat-full' : ''}`}>
      <div className="chat-header">
        <span
          className="chat-avatar"
          style={{ background: 'transparent', padding: 0 }}
        >
          <LogoIcon size={36} />
        </span>
        <div>
          <strong>An Tâm luôn lắng nghe</strong>
          <span>
            <i /> Trợ lý thông tin sức khỏe
          </span>
        </div>
        {c.user && (
          <button
            className="icon-btn"
            onClick={() => c.setShowHistory(!c.showHistory)}
            aria-label="Lịch sử tư vấn"
          >
            <Clock3 size={20} />
          </button>
        )}
        {onClose && (
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Đóng tư vấn"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="chat-mode">
        <ShieldCheck size={13} />
        {{
          gemini: 'Gemini AI',
          safety: 'Thông tin an toàn',
          knowledge_fallback: 'Dùng tri thức nội bộ khi AI gián đoạn',
        }[c.mode] || 'Tra cứu cơ sở tri thức'}
        <span>Thông tin tham khảo</span>
      </div>
      {c.showHistory ? (
        <div className="chat-messages">
          <button className="btn btn-outline" onClick={c.startNewChat}>
            <Plus size={15} /> Cuộc trò chuyện mới
          </button>
          {!c.sessions.length && (
            <p className="muted">
              {c.user
                ? 'Chưa có cuộc hội thoại.'
                : 'Đăng nhập để lưu lịch sử cuộc hội thoại.'}
            </p>
          )}
          {c.sessions.map((s) => (
            <button
              className="chat-history-item"
              key={s.id}
              onClick={() => c.openSession(s.id)}
            >
              <MessageCircle size={17} />
              <span>
                {s.title || 'Cuộc trò chuyện'}
                <small>{dateTime(s.createdAt)}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <div className="chat-messages">
          <div className="chat-bubble assistant">
            <strong>Chào bạn, An Tâm đây 🌿</strong>
            <p>
              Mình có thể giúp bạn tìm thông tin sản phẩm, chính sách mua hàng
              hoặc kết nối với dược sĩ. Bạn đang cần hỗ trợ điều gì?
            </p>
          </div>
          {!c.user && (
            <p className="muted small">
              Bạn có thể hỏi thông tin chung. Đăng nhập để lưu lịch sử hoặc tra
              cứu đơn hàng.
            </p>
          )}
          {c.config?.chatbotEnabled === false && (
            <p className="muted">
              Trợ lý đang tạm dừng. Bạn vẫn có thể gửi yêu cầu đến dược sĩ.
            </p>
          )}
          {c.config?.chatbotEnabled !== false && !c.messages.length && (
            <div className="chat-suggestions">
              {[
                'Nhà thuốc có sản phẩm nào?',
                'Làm thế nào để mua thuốc kê đơn?',
                'Theo dõi đơn hàng của tôi',
              ].map((text) => (
                <button
                  disabled={c.busy}
                  key={text}
                  onClick={() => c.send(text)}
                >
                  {text}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          )}
          {c.messages.map((m, i) => (
            <div
              key={m.id || i}
              className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'} ${m.error ? 'chat-error' : ''}`}
            >
              <p>{m.content}</p>
              {m.products?.length > 0 && (
                <div className="chat-products">
                  {m.products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      onClick={onClose}
                    >
                      <img
                        src={p.image || '/assets/products/vitamin-c.svg'}
                        alt=""
                      />
                      <span>
                        {p.name}
                        <strong>{money(p.price)}</strong>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {c.busy && (
            <div className="chat-bubble assistant typing">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>
      )}
      <div className="chat-bottom">
        <button className="chat-handoff" onClick={c.handoff} disabled={c.busy}>
          <Headphones size={14} /> Kết nối dược sĩ
        </button>
        {c.config?.chatbotEnabled !== false && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              c.send(c.message);
            }}
          >
            <input
              aria-label="Nội dung tư vấn"
              placeholder="Chia sẻ điều bạn cần hỗ trợ…"
              value={c.message}
              onChange={(e) => c.setMessage(e.target.value)}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={c.busy || !c.message.trim()}
              aria-label="Gửi tin nhắn"
            >
              <Send size={18} />
            </button>
          </form>
        )}
        <small>Thông tin tham khảo, không thay thế bác sĩ hoặc dược sĩ.</small>
      </div>
    </section>
  );
}
