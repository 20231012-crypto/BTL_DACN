/**
 * Catalog Controller: manages URL query filters, product listing, price range inputs, and pagination.
 */
import { useEffect, useState } from 'react';
import { PRODUCTS_PER_PAGE } from '../models/constants.js';
import {
  buildActiveCatalogFilters,
  fetchCombos,
  fetchProducts,
} from '../models/catalogModel.js';
import { digitsOnly, formatPriceInput } from '../models/formatters.js';
import { useApp } from './AppContext.jsx';

export function useCatalogController() {
  const {
    route,
    categories,
    manufacturers,
    navigate,
    notify,
    addComboToCart,
  } = useApp();
  const params = new URLSearchParams(route.split('?')[1]);
  const [items, setItems] = useState(null);
  const [combos, setCombos] = useState([]);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [price, setPrice] = useState({
    minPrice: digitsOnly(params.get('minPrice')),
    maxPrice: digitsOnly(params.get('maxPrice')),
  });

  const update = (key, value, extra = {}) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    for (const [k, v] of Object.entries(extra)) {
      v ? next.set(k, v) : next.delete(k);
    }
    next.delete('page');
    const qs = next.toString();
    navigate(`/products${qs ? `?${qs}` : ''}`);
  };

  useEffect(() => {
    const apiParams = new URLSearchParams(params);
    apiParams.delete('page');
    if (!apiParams.has('prescription')) apiParams.set('prescription', 'false');
    fetchProducts(apiParams)
      .then(setItems)
      .catch((e) => setError(e.message));
    fetchCombos()
      .then(setCombos)
      .catch(() => setCombos([]));
  }, []);

  const rawPage = Number.parseInt(params.get('page') || '1', 10);
  const totalPages = items
    ? Math.max(1, Math.ceil(items.length / PRODUCTS_PER_PAGE))
    : 1;
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(rawPage) ? rawPage : 1),
    totalPages,
  );
  const pageStart = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const pagedItems = items
    ? items.slice(pageStart, pageStart + PRODUCTS_PER_PAGE)
    : null;

  const setPage = (nextPage) => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    const qs = next.toString();
    navigate(`/products${qs ? `?${qs}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPriceFilter = (e) => {
    e.preventDefault();
    if (
      price.minPrice &&
      price.maxPrice &&
      Number(price.minPrice) > Number(price.maxPrice)
    ) {
      notify('Giá "Từ" không được lớn hơn giá "Đến".', 'error');
      return;
    }
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(price))
      value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    const qs = next.toString();
    navigate(`/products${qs ? `?${qs}` : ''}`);
  };

  const activeFilters = buildActiveCatalogFilters({
    params,
    categories,
    manufacturers,
    onUpdate: update,
    onClearPrice: () => {
      setPrice({ minPrice: '', maxPrice: '' });
      update('minPrice', '', { maxPrice: '' });
    },
  });

  const clearAllFilters = () => {
    setPrice({ minPrice: '', maxPrice: '' });
    navigate('/products');
  };

  const selectedCat = params.get('category')
    ? categories.find(
        (c) =>
          String(c.id) === params.get('category') ||
          c.slug === params.get('category'),
      )
    : null;

  return {
    params,
    categories,
    manufacturers,
    navigate,
    items,
    combos,
    addComboToCart,
    pagedItems,
    totalPages,
    currentPage,
    pageStart,
    perPage: PRODUCTS_PER_PAGE,
    error,
    showFilters,
    setShowFilters,
    price,
    setPrice,
    formatPriceInput,
    digitsOnly,
    update,
    setPage,
    applyPriceFilter,
    activeFilters,
    extraFilters: activeFilters.filter((f) => f.key !== 'category'),
    selectedCat,
    clearAllFilters,
  };
}
