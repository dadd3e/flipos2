
"use client";

import { useEffect } from 'react';
import { APP_THEME_KEY, DEFAULT_THEME, AVAILABLE_THEMES, type AppTheme } from '@/lib/constants';

const applyTheme = (theme: AppTheme) => {
  const htmlEl = document.documentElement;
  // Remove all potential theme classes first
  AVAILABLE_THEMES.forEach(t => {
    if (t.value !== 'light') { // 'light' is often the absence of other theme classes
      htmlEl.classList.remove(t.value);
    }
  });

  if (theme === 'dark') {
    htmlEl.classList.add('dark');
  } else if (theme === 'retro') {
    htmlEl.classList.add('retro');
  } else if (theme === 'throwback') {
    htmlEl.classList.add('throwback');
  } else if (theme === 'lavender') { // Added this case
    htmlEl.classList.add('lavender');
  }
  // If theme is 'light', no class is added, relying on default :root styles
};

export function ThemeApplicator() {
  useEffect(() => {
    // Apply theme on initial load
    const storedTheme = localStorage.getItem(APP_THEME_KEY) as AppTheme | null;
    applyTheme(storedTheme || DEFAULT_THEME);

    // Listen for theme changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === APP_THEME_KEY && event.newValue) {
        applyTheme(event.newValue as AppTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component does not render anything itself
}
