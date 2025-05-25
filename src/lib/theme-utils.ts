
// src/lib/theme-utils.ts
'use client';

export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

export type Theme = 'light' | 'dark' | 'system' | 'victoria' | 'sapphire' | 'forest' | 'sunset';

// Helper array of specific theme classes (add theme names here as they are created)
const NAMED_THEME_CLASSES: string[] = ['theme-victoria', 'theme-sapphire', 'theme-forest', 'theme-sunset'];

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

  let effectiveThemeClass = '';
  let colorSchemeStyle = '';

  if (theme === 'system') {
    if (isSystemDark) {
      root.classList.add('dark');
      colorSchemeStyle = 'dark';
    } else {
      root.classList.add('light'); // Or could be no class if :root is light by default
      colorSchemeStyle = 'light';
    }
  } else if (theme === 'light') {
    root.classList.add('light'); // Explicitly add 'light'
    colorSchemeStyle = 'light';
  } else if (theme === 'dark') {
    root.classList.add('dark');
    colorSchemeStyle = 'dark';
  } else { // Specific named theme (e.g., 'victoria')
    root.classList.add(`theme-${theme}`);
    // Named themes have their dark mode styled via `.dark .theme-X`
    // So, if the system is dark, we need the .dark class.
    // If the system is light, the theme's base (light) styles apply.
    if (isSystemDark) {
      root.classList.add('dark');
      colorSchemeStyle = 'dark';
    } else {
      // root.classList.add('light'); // Only if named themes need it explicitly
      colorSchemeStyle = 'light';
    }
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
      const validThemes: Theme[] = ['light', 'dark', 'system', 'victoria', 'sapphire', 'forest', 'sunset'];
      if (parsedSettings?.preferences?.theme && validThemes.includes(parsedSettings.preferences.theme)) {
        return parsedSettings.preferences.theme as Theme;
      }
    }
  } catch (e) {
    console.error("Error reading theme from localStorage:", e);
  }
  return 'light'; // Default to 'light' if nothing stored or error
};
