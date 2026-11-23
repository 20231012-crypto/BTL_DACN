/**
 * Product Combo Card View: displays bundled items, savings badge, price comparison, and Add Combo button.
 */
import React, { useState } from 'react';
import { Layers, Plus, ShoppingBag } from 'lucide-react';
import { money } from '../../models/formatters.js';

export default function ComboCard({ combo, onAdd }) {
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (busy || combo.stock <= 0) return;
    setBusy(true);
    try {
      await onAdd?.(combo.id, 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="combo-card">
      <div className="combo-card-media">
        <img
          src={combo.image || '/assets/products/vitamin-c.svg'}
          alt={combo.name}
          loading="lazy"
        />
        <span className="combo-pill">
          <Layers size={12} /> Combo {combo.items?.length || 0} SP
        </span>
        {combo.savings > 0 && (
          <span className="combo-save-badge">
            Tiết kiệm {money(combo.savings)}
          </span>
        )}
      </div>
      <div className="combo-card-body">
        <h3>{combo.name}</h3>
        {combo.description && (
          <p className="combo-card-desc">{combo.description}</p>
        )}
        <ul className="combo-card-items">
          {(combo.items || []).map((ci) => (
            <li key={ci.id || ci.productId}>
              <b>{ci.quantity}×</b> {ci.product?.name || `SP #${ci.productId}`}
            </li>
          ))}
        </ul>
        <div className="combo-card-foot">
          <div className="combo-card-prices">
            <strong>{money(combo.price)}</strong>
            {combo.originalPrice > combo.price && (
              <del>{money(combo.originalPrice)}</del>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary small"
            disabled={busy || combo.stock <= 0}
            onClick={handleAdd}
          >
            {combo.stock > 0 ? (
              <>
                <ShoppingBag size={14} /> Thêm combo
              </>
            ) : (
              'Tạm hết hàng'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
