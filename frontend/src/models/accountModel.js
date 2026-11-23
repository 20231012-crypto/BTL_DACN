/**
 * Account Model: profile, password updates, delivery addresses, Vietnamese locations, and wishlist persistence.
 */
import { api } from './httpClient.js';

export const getWishlistStorageKey = (userId) =>
  `antam_wishlist_${userId || 'guest'}`;

export const loadWishlistFromStorage = (userId) => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(getWishlistStorageKey(userId)) || '[]',
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const saveWishlistToStorage = (userId, items) => {
  try {
    localStorage.setItem(getWishlistStorageKey(userId), JSON.stringify(items));
  } catch {
    // Ignore storage quota errors.
  }
};

export const toggleWishlistItem = (prev, product) => {
  if (!product?.id) return prev;
  const exists = prev.some((item) => item.id === product.id);
  if (exists) return prev.filter((item) => item.id !== product.id);
  return [
    {
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      unit: product.unit,
      image: product.image,
      categoryName: product.categoryName,
      manufacturer: product.manufacturer,
      stock: product.stock,
      prescriptionRequired: product.prescriptionRequired,
      featured: product.featured,
    },
    ...prev,
  ];
};

export const updateProfile = async (profile) => {
  const result = await api('/profile', { method: 'PATCH', body: profile });
  return result.user || result;
};

export const changeUserPassword = (currentPassword, newPassword) =>
  api('/profile/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

export const fetchAddresses = async () => {
  const data = await api('/addresses');
  return Array.isArray(data) ? data : data.items || [];
};

export const saveCustomerAddress = (editingId, address) =>
  api(`/addresses${editingId === 'new' ? '' : `/${editingId}`}`, {
    method: editingId === 'new' ? 'POST' : 'PATCH',
    body: address,
  });

export const deleteCustomerAddress = (id) =>
  api(`/addresses/${id}`, { method: 'DELETE' });

export const fetchLocations = (query, signal) => {
  const qs = new URLSearchParams();
  if (query.version) qs.set('version', query.version);
  if (query.province) qs.set('province', query.province);
  if (query.district) qs.set('district', query.district);
  return api(`/locations?${qs}`, { signal });
};
