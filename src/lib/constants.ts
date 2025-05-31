
// src/lib/constants.ts

// Storage key for general app settings (theme, preferences, etc.)
export const SETTINGS_STORAGE_KEY = '4eunoia-app-settings';

// Storage keys for user-specific data (used for localStorage)
export const CALENDAR_EVENTS_STORAGE_KEY = 'prodev-calendar-events';
export const DAILY_LOG_STORAGE_KEY = '4eunoia-daily-logs';
export const EXPENSE_STORAGE_KEY = 'prodev-expenses';
export const GOALS_STORAGE_KEY = 'prodev-goals';
export const HABITS_STORAGE_KEY = 'prodev-habits';
export const NOTES_STORAGE_KEY = 'prodev-notes';
export const REMINDER_STORAGE_KEY = 'prodev-reminders';
export const TASK_STORAGE_KEY = 'prodev-tasks';
export const WELLNESS_GRATITUDE_STORAGE_KEY = '4eunoia-wellness-gratitude';
export const WELLNESS_REFRAMING_STORAGE_KEY = '4eunoia-wellness-reframing';

// List of all keys that store user-generated data in localStorage
export const ALL_USER_DATA_STORAGE_KEYS = [
  CALENDAR_EVENTS_STORAGE_KEY,
  DAILY_LOG_STORAGE_KEY,
  EXPENSE_STORAGE_KEY,
  GOALS_STORAGE_KEY,
  HABITS_STORAGE_KEY,
  NOTES_STORAGE_KEY,
  REMINDER_STORAGE_KEY,
  TASK_STORAGE_KEY,
  WELLNESS_GRATITUDE_STORAGE_KEY,
  WELLNESS_REFRAMING_STORAGE_KEY,
  // Note: SETTINGS_STORAGE_KEY is intentionally omitted here if we want settings
  // to persist even after clearing "user data". If settings should also be cleared, add it.
];

// Other constants can be added here as needed.
