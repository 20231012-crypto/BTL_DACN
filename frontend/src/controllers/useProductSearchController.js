/**
 * Product Search Controller: handles debounced typeahead suggestions, category scope menu, and keyboard navigation.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { fetchProductSuggestions } from '../models/catalogModel.js';

export function useProductSearchController({
  value,
  onChange,
  onSubmit,
  onChoose,
  prescription = 'false',
  categories = null,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scope, setScope] = useState({
    prescription: categories ? 'all' : prescription,
    category: '',
    label: 'Tất cả',
  });

  const effectivePrescription = categories ? scope.prescription : prescription;
  const effectiveCategory = categories ? scope.category : '';

  useEffect(() => {
    setItems([]);
    setActive(-1);
    const trimmed = value.trim();
    const shouldFetch = Boolean(
      trimmed ||
        (categories &&
          open &&
          (effectiveCategory || effectivePrescription === 'true')),
    );
    if (!shouldFetch) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        const qs = new URLSearchParams();
        if (trimmed) qs.set('search', trimmed);
        qs.set('prescription', effectivePrescription);
        if (effectiveCategory) qs.set('category', effectiveCategory);
        fetchProductSuggestions(qs, controller.signal)
          .then(setItems)
          .catch(() => {});
      },
      trimmed ? 180 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, effectivePrescription, effectiveCategory, open, categories]);

  const choose = (product) => {
    setOpen(false);
    setMenuOpen(false);
    onChange(product.name);
    onChoose(product);
  };

  const selectScope = (nextScope) => {
    setScope(nextScope);
    setMenuOpen(false);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setOpen(false);
    setMenuOpen(false);
    onSubmit(value, {
      prescription: effectivePrescription,
      category: effectiveCategory,
    });
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setMenuOpen(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setMenuOpen(false);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive(
        Math.max(
          -1,
          Math.min(
            items.length - 1,
            active + (event.key === 'ArrowDown' ? 1 : -1),
          ),
        ),
      );
    }
    if (event.key === 'Enter' && open && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    }
  };

  return {
    id,
    inputRef,
    items,
    open,
    setOpen,
    menuOpen,
    setMenuOpen,
    active,
    scope,
    effectivePrescription,
    choose,
    selectScope,
    handleSubmit,
    handleBlur,
    handleKeyDown,
  };
}
