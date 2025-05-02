'use client'; // Mark as client component if using hooks like useDataMode or localStorage directly

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

// Local storage key
export const DAILY_LOG_STORAGE_KEY = 'prodev-daily-logs';

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
      }));
      return parsedLogs.sort((a: LogEntry, b: LogEntry) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.error("Error parsing logs from localStorage:", e);
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
    return mockLogsRaw.map(log => ({
        ...log,
        date: parseISO(log.date),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

// Function to add a new user log entry
export const addUserLog = (newLogData: Omit<LogEntry, 'id'>): LogEntry => {
    const userLogs = loadUserLogs();
    const newLog: LogEntry = {
        ...newLogData,
        id: crypto.randomUUID(),
    };
    const updatedLogs = [newLog, ...userLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveUserLogs(updatedLogs);
    return newLog;
}

// Function to update a user log entry (if needed, though logs are often append-only)
// export const updateUserLog = (updatedLog: LogEntry): LogEntry | undefined => { ... }

// Function to delete a user log entry (if needed)
// export const deleteUserLog = (logId: string): boolean => { ... }