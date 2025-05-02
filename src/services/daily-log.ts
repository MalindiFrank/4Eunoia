'use client'; // Mark as client component if using hooks like useDataMode or localStorage directly

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

// Local storage key
export const DAILY_LOG_STORAGE_KEY = '4eunoia-daily-logs'; // Use consistent prefix

// Mood type definition (ensure consistency)
const moodOptions = ['😊 Happy', '😌 Calm', '😕 Neutral', '😟 Anxious', '😢 Sad', '😠 Stressed', '⚡ Productive', '😴 Tired', '❓ Other'] as const;
export type Mood = typeof moodOptions[number];

export interface LogEntry {
  id: string;
  date: Date;
  activity: string;
  mood?: Mood;
  notes?: string;
  diaryEntry?: string;
  focusLevel?: number; // Added: 1 (Low) to 5 (High)
}

// Function to load logs from localStorage
const loadUserLogs = (): LogEntry[] => {
  if (typeof window === 'undefined') return [];
  const storedLogs = localStorage.getItem(DAILY_LOG_STORAGE_KEY);
  if (storedLogs) {
    try {
      const parsedLogs = JSON.parse(storedLogs).map((log: any) => ({
        ...log,
        date: parseISO(log.date),
        // Ensure focusLevel is treated as a number if it exists
        focusLevel: typeof log.focusLevel === 'number' ? log.focusLevel : undefined,
      }));
      return parsedLogs.sort((a: LogEntry, b: LogEntry) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.error("Error parsing logs from localStorage:", e);
      localStorage.removeItem(DAILY_LOG_STORAGE_KEY); // Clear corrupted data
      return [];
    }
  }
  return [];
};

// Function to save logs to localStorage
export const saveUserLogs = (logs: LogEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    const logsToStore = logs.map(log => ({
      ...log,
      date: log.date.toISOString(),
      // Only store focusLevel if it's a valid number
      focusLevel: typeof log.focusLevel === 'number' && log.focusLevel >= 1 && log.focusLevel <= 5 ? log.focusLevel : undefined,
    }));
    localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify(logsToStore));
  } catch (e) {
    console.error("Error saving logs to localStorage:", e);
  }
};

// Function to fetch daily logs based on data mode
export async function getDailyLogs(dataMode: 'mock' | 'user'): Promise<LogEntry[]> {
  if (dataMode === 'user') {
    return loadUserLogs();
  } else {
    const mockLogsRaw = await loadMockData<any>('daily-logs');
    return mockLogsRaw.map((log: any) => ({
        ...log,
        date: parseISO(log.date),
        focusLevel: typeof log.focusLevel === 'number' ? log.focusLevel : undefined, // Handle mock data potentially having focusLevel
    })).sort((a: LogEntry, b: LogEntry) => b.date.getTime() - a.date.getTime());
  }
}

// Function to add a new user log entry
export const addUserLog = (newLogData: Omit<LogEntry, 'id'>): LogEntry => {
    const userLogs = loadUserLogs();
    const newLog: LogEntry = {
        ...newLogData,
        id: crypto.randomUUID(),
        // Ensure focusLevel is valid or undefined before adding
        focusLevel: typeof newLogData.focusLevel === 'number' && newLogData.focusLevel >= 1 && newLogData.focusLevel <= 5
            ? newLogData.focusLevel
            : undefined,
    };
    const updatedLogs = [newLog, ...userLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveUserLogs(updatedLogs);
    return newLog;
}

// Function to update a user log entry (if needed, though logs are often append-only)
export const updateUserLog = (updatedLog: LogEntry): LogEntry | undefined => {
     if (!updatedLog.id) return undefined;
     const userLogs = loadUserLogs();
     let found = false;
     const updatedLogs = userLogs.map(log => {
         if (log.id === updatedLog.id) {
             found = true;
             // Ensure focusLevel is valid or undefined on update
             return {
                 ...log,
                 ...updatedLog,
                 focusLevel: typeof updatedLog.focusLevel === 'number' && updatedLog.focusLevel >= 1 && updatedLog.focusLevel <= 5
                     ? updatedLog.focusLevel
                     : undefined,
             };
         }
         return log;
     }).sort((a, b) => b.date.getTime() - a.date.getTime());

     if (found) {
         saveUserLogs(updatedLogs);
         return updatedLog; // Return potentially modified updatedLog
     }
     return undefined;
}

// Function to delete a user log entry
export const deleteUserLog = (logId: string): boolean => {
    const userLogs = loadUserLogs();
    const updatedLogs = userLogs.filter(log => log.id !== logId);
    if (updatedLogs.length < userLogs.length) {
        saveUserLogs(updatedLogs);
        return true;
    }
    return false;
}
