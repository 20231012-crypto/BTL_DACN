/**
 * Catalog Model: categories, manufacturers, system config, products, and typeahead suggestions.
 */
import { api } from './httpClient.js';
import { formatPriceInput } from './formatters.js';

export const fetchCategories = async () => {
  const data = await api('/categories');
  return Array.isArray(data) ? data : data.items || [];
};

export const fetchManufacturers = () => api('/manufacturers');

export const fetchPublicConfig = () => api('/config');

export const fetchProducts = async (searchParams) => {
  const result = await api(`/products?${searchParams}`);
  return Array.isArray(result)
    ? result
    : result.items || result.products || [];
};

export const fetchFeaturedProducts = () =>
  fetchProducts('sort=featured&prescription=false');

export const fetchProductDetail = (id) => api(`/products/${id}`);

export const fetchRelatedProducts = async (categoryId, excludeId) => {
  const rows = await fetchProducts(
    `category=${categoryId}&prescription=all`,
  );
  return rows.filter((item) => item.id !== excludeId).slice(0, 4);
};

export const fetchProductSuggestions = (searchParams, signal) =>
  api(`/products/suggestions?${searchParams}`, { signal });

export function buildActiveCatalogFilters({
  params,
  categories,
  manufacturers,
  onUpdate,
  onClearPrice,
}) {
  const filters = [];
  if (params.get('search')) {
    filters.push({
      key: 'search',
      label: `Từ khóa: “${params.get('search')}”`,
      clear: () => onUpdate('search', ''),
    });
  }
  if (params.get('category')) {
    const cat = categories.find(
      (c) =>
        String(c.id) === params.get('category') ||
        c.slug === params.get('category'),
    );
    filters.push({
      key: 'category',
      label: `Danh mục: ${cat?.name || params.get('category')}`,
      clear: () => onUpdate('category', ''),
    });
  }
  if (
    params.get('prescription') &&
    params.get('prescription') !== 'false'
  ) {
    filters.push({
      key: 'prescription',
      label:
        params.get('prescription') === 'true'
          ? 'Phân loại: Thuốc kê đơn'
          : 'Phân loại: Tất cả',
      clear: () => onUpdate('prescription', ''),
    });
  }
  if (params.get('manufacturer')) {
    const maker = manufacturers.find(
      (m) => String(m.id) === params.get('manufacturer'),
    );
    filters.push({
      key: 'manufacturer',
      label: `NSX: ${maker?.name || params.get('manufacturer')}`,
      clear: () => onUpdate('manufacturer', ''),
    });
  }
  if (params.get('minPrice') || params.get('maxPrice')) {
    const min = params.get('minPrice')
      ? `${formatPriceInput(params.get('minPrice'))}đ`
      : '0đ';
    const max = params.get('maxPrice')
      ? `${formatPriceInput(params.get('maxPrice'))}đ`
      : 'trở lên';
    filters.push({
      key: 'price',
      label: `Giá: ${min} – ${max}`,
      clear: onClearPrice,
    });
  }
  if (params.get('inStock') === 'true') {
    filters.push({
      key: 'inStock',
      label: 'Chỉ hàng có sẵn',
      clear: () => onUpdate('inStock', ''),
    });
  }
  return filters;
}
