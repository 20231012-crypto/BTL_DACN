/**
 * Site Footer View.
 */
import React from 'react';
import { ArrowUpRight, HeartPulse, Leaf, MessageCircle } from 'lucide-react';
import { useApp } from '../../controllers/AppContext.jsx';
import Link from '../components/Link.jsx';
import { LogoIcon } from '../components/Logo.jsx';

export default function Footer() {
  const { setChatOpen } = useApp();
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <LogoIcon size={37} />
            </span>
            <span>
              <small>NHÀ THUỐC</small>
              <strong>
                an tâm<span>.</span>
              </strong>
            </span>
          </Link>
          <p>
            Chăm sóc tận tâm.
            <br />
            An tâm mỗi ngày.
          </p>
          <span className="footer-made">
            <HeartPulse size={15} /> Đồng hành cùng sức khỏe gia đình
          </span>
        </div>
        <div>
          <h3>Khám phá An Tâm</h3>
          <Link to="/products">Tất cả sản phẩm</Link>
          <Link to="/products?prescription=false">Thuốc không kê đơn</Link>
          <Link to="/prescription">Thuốc theo đơn</Link>
          <Link to="/chat">Trợ lý thông tin sức khỏe</Link>
        </div>
        <div>
          <h3>Chúng tôi hỗ trợ bạn</h3>
          <Link to="/orders">Theo dõi đơn hàng</Link>
          <Link to="/account">Tài khoản của tôi</Link>
          <button onClick={() => setChatOpen(true)}>
            Hướng dẫn mua hàng & đổi trả
          </button>
        </div>
        <div className="footer-contact">
          <h3>Luôn sẵn sàng lắng nghe</h3>
          <p>
            Cần hỗ trợ chọn lựa?
            <br />
            Hãy trao đổi cùng An Tâm.
          </p>
          <button
            className="footer-consult"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle size={17} /> Bắt đầu trò chuyện{' '}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 An Tâm · Đồ án chuyên ngành, Nhóm 11</span>
        <span>
          Hệ thống trình diễn · Dữ liệu mẫu · Không giao dịch tiền thật
        </span>
        <span className="footer-leaf">
          <Leaf size={16} /> Care, thoughtfully.
        </span>
      </div>
    </footer>
  );
}
