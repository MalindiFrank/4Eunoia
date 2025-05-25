// src/lib/theme-utils.ts
'use client';

export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

export type Theme = 'light' | 'dark' | 'system' | 'victoria' | 'sapphire' | 'forest' | 'sunset'; // Added new themes

/**
 * Applies the specified theme to the document's root element.
 * @param theme The theme to apply.
 */
export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  // Remove all possible theme classes
  root.classList.remove('light', 'dark', 'theme-victoria', 'theme-sapphire', 'theme-forest', 'theme-sunset'); 

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
    // console.log(`Applied system theme, resolved to: ${systemTheme}`);
    return;
  }
  
  // For specific themes like 'light', 'dark', 'victoria', 'sapphire', 'forest', 'sunset'
  if (theme === 'victoria' || theme === 'sapphire' || theme === 'forest' || theme === 'sunset') {
    root.classList.add(`theme-${theme}`);
    // If system is dark and a specific vibrant theme is chosen,
    // we need to ensure the .dark class is also present for components that might not be fully themed by the specific theme class.
    // This is important if the specific theme's dark mode relies on being nested under .dark.
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // For themes that have their own .dark .theme-X definitions,
        // adding .dark here helps with general dark mode compatibility.
        root.classList.add('dark');
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
      const validThemes: Theme[] = ['light', 'dark', 'system', 'victoria', 'sapphire', 'forest', 'sunset'];
      if (parsedSettings?.preferences?.theme && validThemes.includes(parsedSettings.preferences.theme)) {
        return parsedSettings.preferences.theme as Theme;
      }
    }
  } catch (e) {
    console.error("Error reading theme from localStorage:", e);
  }
  return 'system'; // Default if nothing stored or error
};
