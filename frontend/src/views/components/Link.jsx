/**
 * Client-side SPA Link View delegating navigation to AppController.
 */
import React from 'react';
import { useApp } from '../../controllers/AppContext.jsx';

export default function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useApp();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !e.ctrlKey && !e.metaKey && e.button === 0) {
          e.preventDefault();
          navigate(to);
        }
      }}
    >
      {children}
    </a>
  );
}
