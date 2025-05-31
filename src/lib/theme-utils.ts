
// src/lib/theme-utils.ts
'use client';

export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

export type Theme = 'light' | 'dark' | 'system';

// Helper array of specific theme classes (empty now as we removed named themes)
const NAMED_THEME_CLASSES: string[] = [];

/**
 * Applies the specified theme to the document's root element.
 * @param theme The theme to apply.
 */
export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Remove all potentially conflicting classes first
  root.classList.remove('light', 'dark', ...NAMED_THEME_CLASSES);

  let colorSchemeStyle = '';

  if (theme === 'system') {
    if (isSystemDark) {
      root.classList.add('dark');
      colorSchemeStyle = 'dark';
    } else {
      root.classList.add('light');
      colorSchemeStyle = 'light';
    }
  } else if (theme === 'light') {
    root.classList.add('light');
    colorSchemeStyle = 'light';
  } else if (theme === 'dark') {
    root.classList.add('dark');
    colorSchemeStyle = 'dark';
  }
  // console.log(`Applying theme: ${theme}, Effective class: ${root.className}, Color scheme: ${colorSchemeStyle}`);
  root.style.colorScheme = colorSchemeStyle;
};

/**
 * Retrieves the initial theme preference from localStorage or defaults to 'light'.
 * @returns The initial theme preference.
 */
export const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'; // Default for SSR to ensure consistency, client will take over
  }
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      const validThemes: Theme[] = ['light', 'dark', 'system'];
      if (parsedSettings?.preferences?.theme && validThemes.includes(parsedSettings.preferences.theme)) {
        return parsedSettings.preferences.theme as Theme;
      }
    }
  } catch (e) {
    console.error("Error reading theme from localStorage:", e);
  }
  return 'light'; // Default to 'light' if nothing stored or error
};
