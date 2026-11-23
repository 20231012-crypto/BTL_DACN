/**
 * Home Controller: loads featured products and active product combos for the storefront homepage.
 */
import { useEffect, useState } from 'react';
import { fetchCombos, fetchFeaturedProducts } from '../models/catalogModel.js';
import { useApp } from './AppContext.jsx';

export function useHomeController() {
  const { categories, setChatOpen, addComboToCart } = useApp();
  const [products, setProducts] = useState(null);
  const [combos, setCombos] = useState([]);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchFeaturedProducts()
      .then(setProducts)
      .catch((e) => setError(e.message));
    fetchCombos()
      .then(setCombos)
      .catch(() => setCombos([]));
  }, []);

  const shown = products
    ?.filter((p) => category === 'all' || String(p.categoryId) === category)
    .slice(0, 8);

  return {
    categories,
    products,
    combos,
    shown,
    error,
    category,
    setCategory,
    addComboToCart,
    openChat: () => setChatOpen(true),
  };
}
