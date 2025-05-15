// src/lib/theme-utils.ts
'use client';

export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Applies the specified theme to the document's root element.
 * @param theme The theme to apply ('light', 'dark', or 'system').
 */
export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
    // console.log(`Applied system theme, resolved to: ${systemTheme}`);
    return;
  }
  root.classList.add(theme);
  // console.log(`Applied theme: ${theme}`);
};

/**
 * Retrieves the initial theme preference from localStorage or defaults to 'system'.
 * @returns The initial theme preference.
 */
export const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'system'; // Default for SSR or non-browser environments
  }
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      if (parsedSettings?.preferences?.theme && ['light', 'dark', 'system'].includes(parsedSettings.preferences.theme)) {
        return parsedSettings.preferences.theme as Theme;
      }
    }
  } catch (e) {
    console.error("Error reading theme from localStorage:", e);
  }
  return 'system'; // Default if nothing stored or error
};
