/**
 * Header Controller: manages header search draft, mobile drawer menu, category dropdown, and body scroll lock.
 */
import { useEffect, useState } from 'react';
import { computeCartItemCount } from '../models/cartModel.js';
import { useApp } from './AppContext.jsx';

export function useHeaderController() {
  const {
    user,
    cart,
    route,
    navigate,
    categories,
    chatOpen,
    setChatOpen,
  } = useApp();
  const path = route.split('?')[0];
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const cartCount = computeCartItemCount(cart);

  useEffect(() => {
    setMenu(false);
    setCatMenu(false);
  }, [route]);

  useEffect(() => {
    if (!menu) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenu(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  const submitSearch = (query, scope) => {
    const qs = new URLSearchParams();
    if (query.trim()) qs.set('search', query.trim());
    if (scope?.prescription) qs.set('prescription', scope.prescription);
    if (scope?.category) qs.set('category', scope.category);
    navigate(`/products${qs.toString() ? `?${qs}` : ''}`);
  };

  const openChatDrawer = () => {
    setMenu(false);
    setChatOpen(true);
  };

  return {
    user,
    path,
    categories,
    chatOpen,
    cartCount,
    search,
    setSearch,
    menu,
    setMenu,
    catMenu,
    setCatMenu,
    navigate,
    submitSearch,
    openChatDrawer,
  };
}
