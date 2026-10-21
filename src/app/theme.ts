/**
 * Light / dark mode. Default follows the system, and is dark when the system
 * doesn't ask for light (Adam, 2026-10-21). A choice made with the toggle is
 * remembered in this browser (localStorage, best effort). index.html applies
 * the same rule before first paint.
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'fairshare-theme';

function stored(): Theme | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function system(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        // Storage blocked: the choice lasts for this page view only.
      }
      return next;
    });
  }, []);
  return [theme, toggle];
}
