/**
 * Product Card View Component.
 */
import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { money } from '../../models/formatters.js';
import { useApp } from '../../controllers/AppContext.jsx';
import Link from './Link.jsx';

export default function ProductCard({ product: p }) {
  const { addToCart, isWishlisted, toggleWishlist } = useApp();
  const wished = isWishlisted(p.id);

  return (
    <article className="product-card">
      <div className="product-picture-wrap">
        <button
          type="button"
          className={`product-wish${wished ? ' active' : ''}`}
          onClick={() => toggleWishlist(p)}
          aria-label={wished ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}
          title={wished ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}
        >
          <Heart size={15} fill={wished ? 'currentColor' : 'none'} />
        </button>
        <Link to={`/products/${p.id}`} className="product-picture">
          {p.prescriptionRequired ? (
            <span className="product-tag rx-tag">Cần đơn thuốc</span>
          ) : p.oldPrice > p.price ? (
            <span className="product-tag">
              −{Math.round((1 - p.price / p.oldPrice) * 100)}%
            </span>
          ) : p.featured ? (
            <span className="product-tag neutral-tag">Được quan tâm</span>
          ) : null}
          <img
            src={p.image || '/assets/products/vitamin-c.svg'}
            alt={p.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/assets/products/vitamin-c.svg';
            }}
          />
        </Link>
      </div>
      <div className="product-info">
        <span className="product-category">
          {p.categoryName || p.manufacturer || 'Chăm sóc sức khỏe'}
        </span>
        <Link to={`/products/${p.id}`} className="product-name">
          {p.name}
        </Link>
        <span className="product-unit">{p.unit}</span>
        <div className="price-row">
          <strong>{money(p.price)}</strong>
          {p.oldPrice > p.price && <del>{money(p.oldPrice)}</del>}
        </div>
        <button
          className="product-add"
          disabled={p.stock <= 0}
          onClick={() => addToCart(p.id)}
        >
          {p.stock > 0 ? (
            <>
              <Plus size={16} /> Thêm vào giỏ
            </>
          ) : (
            'Tạm hết hàng'
          )}
        </button>
      </div>
    </article>
  );
}
