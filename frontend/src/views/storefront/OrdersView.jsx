/**
 * Customer Orders List View powered by useOrdersController.
 */
import React from 'react';
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Package,
  RotateCcw,
} from 'lucide-react';
import { label } from '../../models/constants.js';
import { dateTime, money } from '../../models/formatters.js';
import { useOrdersController } from '../../controllers/useOrdersController.js';
import Link from '../components/Link.jsx';
import {
  Badge,
  Breadcrumb,
  Empty,
  ErrorBox,
  RequireLogin,
  Spinner,
} from '../components/UiPrimitives.jsx';

export default function OrdersView() {
  const c = useOrdersController();

  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Đơn hàng của tôi" />
        <div className="page-heading">
          <span className="eyebrow">MỖI ĐƠN HÀNG, MỘT SỰ QUAN TÂM</span>
          <h1>Đơn hàng của tôi</h1>
          <p>Theo dõi và quản lý đơn hàng tại An Tâm.</p>
        </div>
        <div className="filter-tabs">
          {[
            ['all', 'Tất cả đơn hàng'],
            ['pending', 'Đang xử lý'],
            ['done', 'Đã nhận hàng'],
          ].map(([value, title]) => (
            <button
              className={c.filter === value ? 'selected' : ''}
              key={value}
              onClick={() => c.setFilter(value)}
            >
              {title}
            </button>
          ))}
        </div>
        <ErrorBox error={c.error} />
        {!c.orders && !c.error ? (
          <Spinner />
        ) : c.shown?.length ? (
          <div className="orders-list">
            {c.shown.map((o) => (
              <Link
                to={`/orders/${o.id}`}
                className="panel order-card"
                key={o.id}
              >
                <div className="order-card-header">
                  <strong>{o.code}</strong>
                  <span>{dateTime(o.createdAt)}</span>
                  <Badge value={o.status} />
                </div>
                <div className="order-card-body">
                  <span className="order-box-icon">
                    <Package size={29} />
                  </span>
                  <div>
                    <strong>
                      {o.items?.map((i) => i.name).join(', ') ||
                        `${o.itemCount || ''} sản phẩm chăm sóc sức khỏe`}
                    </strong>
                    <span>
                      {label(o.paymentMethod)} · {label(o.paymentStatus)}
                    </span>
                  </div>
                  <strong>{money(o.total)}</strong>
                  <button
                    type="button"
                    className="btn btn-outline btn-small order-reorder-btn"
                    disabled={c.reorderingId === o.id}
                    onClick={(e) => c.handleReorder(e, o.id)}
                  >
                    <RotateCcw size={14} />{' '}
                    {c.reorderingId === o.id ? 'Đang thêm…' : 'Mua lại'}
                  </button>
                  <ChevronRight size={19} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            icon={ClipboardList}
            title="Chưa có đơn hàng trong mục này"
            text="Các đơn mua sắm của bạn sẽ xuất hiện tại đây."
          >
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
          </Empty>
        )}
      </main>
    </RequireLogin>
  );
}
