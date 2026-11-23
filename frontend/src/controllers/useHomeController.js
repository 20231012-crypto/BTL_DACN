/**
 * Home Controller: loads featured products and handles category tab filtering on storefront home.
 */
import { useEffect, useState } from 'react';
import { fetchFeaturedProducts } from '../models/catalogModel.js';
import { useApp } from './AppContext.jsx';

export function useHomeController() {
  const { categories, setChatOpen } = useApp();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchFeaturedProducts()
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);

  const shown = products
    ?.filter((p) => category === 'all' || String(p.categoryId) === category)
    .slice(0, 8);

  return {
    categories,
    products,
    shown,
    error,
    category,
    setCategory,
    openChat: () => setChatOpen(true),
  };
}
