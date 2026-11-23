/**
 * Search Select Controller: filters administrative options and handles keyboard combobox navigation.
 */
import { useEffect, useId, useState } from 'react';
import { normalizeSearch } from '../models/formatters.js';

export function useSearchSelectController({ value = '', options, onChange }) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = options.filter((row) =>
    normalizeSearch(row.name).includes(
      normalizeSearch(query === value ? '' : query),
    ),
  );

  const choose = (row) => {
    onChange(row);
    setQuery(row.name);
    setOpen(false);
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
      setQuery(value);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            matches.length - 1,
            index + (event.key === 'ArrowDown' ? 1 : -1),
          ),
        ),
      );
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]);
    }
  };

  return {
    id,
    query,
    setQuery,
    open,
    setOpen,
    active,
    setActive,
    matches,
    choose,
    handleBlur,
    handleKeyDown,
  };
}
