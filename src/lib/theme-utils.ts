// src/lib/theme-utils.ts
'use client';

export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

export type Theme = 'light' | 'dark' | 'system' | 'victoria'; // Added 'victoria'

/**
 * Applies the specified theme to the document's root element.
 * @param theme The theme to apply.
 */
export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark', 'theme-victoria'); // Ensure all theme classes are removed first

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
    // console.log(`Applied system theme, resolved to: ${systemTheme}`);
    return;
  }
  // For 'light', 'dark', or 'victoria'
  if (theme === 'victoria') {
    root.classList.add('theme-victoria');
    // If victoria is chosen, we also need to set a base light/dark mode for non-themed components
    // or ensure victoria theme provides all necessary fallbacks.
    // For now, let's assume victoria implies a light variant unless .dark is also present
    // If system is dark and victoria is chosen, apply .dark for components not covered by .theme-victoria
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // This logic might need refinement: do we want .dark .theme-victoria or just .theme-victoria?
        // For now, .theme-victoria in globals.css has its own dark mode definitions.
    }
  } else {
    root.classList.add(theme); // 'light' or 'dark'
  }
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
      if (parsedSettings?.preferences?.theme && ['light', 'dark', 'system', 'victoria'].includes(parsedSettings.preferences.theme)) {
        return parsedSettings.preferences.theme as Theme;
      }
    }
  } catch (e) {
    console.error("Error reading theme from localStorage:", e);
  }
  return 'system'; // Default if nothing stored or error
};
