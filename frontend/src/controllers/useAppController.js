/**
 * Root Application Controller: manages routing, auth session, cart, wishlist, config, and notifications.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentUser, logoutAccount } from '../models/authModel.js';
import {
  fetchCategories,
  fetchManufacturers,
  fetchPublicConfig,
} from '../models/catalogModel.js';
import {
  addCartItem,
  addComboToCart as addComboToCartApi,
  fetchCart,
} from '../models/cartModel.js';
import { fetchOrderById } from '../models/orderModel.js';
import {
  loadWishlistFromStorage,
  saveWishlistToStorage,
  toggleWishlistItem,
} from '../models/accountModel.js';

const pathNow = () => `${location.pathname}${location.search}`;

export function useAppController() {
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [route, setRoute] = useState(pathNow);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [config, setConfig] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toast, setToast] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setWishlist(loadWishlistFromStorage(user?.id));
  }, [user?.id]);

  const isWishlisted = useCallback(
    (productId) => wishlist.some((item) => item.id === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (!product?.id) return;
      setWishlist((prev) => {
        const next = toggleWishlistItem(prev, product);
        saveWishlistToStorage(user?.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const notify = useCallback(
    (message, type = 'success') =>
      setToast({ message, type, id: Date.now() }),
    [],
  );

  const clearToast = useCallback(() => setToast(null), []);

  const navigate = useCallback((to) => {
    history.pushState({}, '', to);
    setRoute(pathNow());
    setChatOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(pathNow());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await fetchCart());
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      fetchCurrentUser(),
      fetchCategories(),
      fetchManufacturers(),
      fetchPublicConfig(),
    ]).then(([me, cats, makers, settings]) => {
      if (me.status === 'fulfilled') setUser(me.value);
      if (cats.status === 'fulfilled') setCategories(cats.value);
      if (makers.status === 'fulfilled') setManufacturers(makers.value);
      if (settings.status === 'fulfilled') setConfig(settings.value);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (user) refreshCart();
    else setCart([]);
  }, [user, refreshCart]);

  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      if (!user) {
        notify('Đăng nhập để thêm sản phẩm vào giỏ hàng.', 'info');
        navigate(`/login?next=${encodeURIComponent(route)}`);
        return false;
      }
      try {
        await addCartItem(productId, quantity);
        await refreshCart();
        notify('Đã thêm sản phẩm vào giỏ hàng.');
        return true;
      } catch (e) {
        notify(e.message, 'error');
        return false;
      }
    },
    [user, route, notify, navigate, refreshCart],
  );

  const addComboToCart = useCallback(
    async (comboId, quantity = 1) => {
      if (!user) {
        notify('Đăng nhập để thêm combo vào giỏ hàng.', 'info');
        navigate(`/login?next=${encodeURIComponent(route)}`);
        return false;
      }
      try {
        await addComboToCartApi(comboId, quantity);
        await refreshCart();
        notify('Đã thêm combo sản phẩm vào giỏ hàng.');
        return true;
      } catch (e) {
        notify(e.message, 'error');
        return false;
      }
    },
    [user, route, notify, navigate, refreshCart],
  );

  const reorder = useCallback(
    async (orderOrId) => {
      if (!user) {
        navigate('/login?next=%2Forders');
        return;
      }
      try {
        const detail =
          typeof orderOrId === 'object' && Array.isArray(orderOrId?.items)
            ? orderOrId
            : await fetchOrderById(orderOrId);
        const items = detail?.items || [];
        if (!items.length) {
          notify('Đơn hàng này chưa có sản phẩm để mua lại.', 'error');
          return;
        }
        let added = 0;
        let skipped = 0;
        for (const item of items) {
          try {
            await addCartItem(item.productId, item.quantity || 1);
            added += 1;
          } catch {
            skipped += 1;
          }
        }
        await refreshCart();
        if (!added) {
          notify(
            'Các sản phẩm trong đơn hiện tạm hết hàng hoặc đã ngừng bán.',
            'error',
          );
          return;
        }
        notify(
          skipped
            ? `Đã thêm ${added} sản phẩm vào giỏ (${skipped} sản phẩm tạm hết hàng hoặc ngừng bán).`
            : `Đã thêm ${added} sản phẩm từ đơn ${detail.code || ''} vào giỏ hàng.`,
        );
        navigate('/cart');
      } catch (e) {
        notify(e.message, 'error');
      }
    },
    [user, navigate, notify, refreshCart],
  );

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
      setUser(null);
      setCart([]);
      navigate('/');
      notify('Bạn đã đăng xuất.');
    } catch (e) {
      notify(e.message, 'error');
    }
  }, [navigate, notify]);

  return {
    user,
    setUser,
    ready,
    route,
    path: route.split('?')[0],
    categories,
    manufacturers,
    config,
    cart,
    wishlist,
    toast,
    clearToast,
    isWishlisted,
    toggleWishlist,
    refreshCart,
    navigate,
    notify,
    addToCart,
    addComboToCart,
    reorder,
    logout,
    chatOpen,
    setChatOpen,
    selectedPrescription,
    setSelectedPrescription,
  };
}
