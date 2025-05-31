
'use client'; 

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader';

export const DAILY_LOG_STORAGE_KEY = '4eunoia-daily-logs';

const moodOptions = ['😊 Happy', '😌 Calm', '😕 Neutral', '😟 Anxious', '😢 Sad', '😠 Stressed', '⚡ Productive', '😴 Tired', '❓ Other'] as const;
export type Mood = typeof moodOptions[number];

export interface LogEntry {
  id: string;
  date: Date;
  activity: string;
  mood?: Mood;
  notes?: string;
  diaryEntry?: string;
  focusLevel?: number; 
}

const loadUserLogs = (): LogEntry[] => {
  if (typeof window === 'undefined') return [];
  const storedLogs = localStorage.getItem(DAILY_LOG_STORAGE_KEY);
  if (storedLogs) {
    try {
      const parsedLogs = JSON.parse(storedLogs).map((log: any) => ({
        ...log,
        date: parseISO(log.date),
        focusLevel: typeof log.focusLevel === 'number' ? log.focusLevel : undefined,
      }));
      return parsedLogs.sort((a: LogEntry, b: LogEntry) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.error("Error parsing logs from localStorage:", e);
      localStorage.removeItem(DAILY_LOG_STORAGE_KEY); 
      return [];
    }
  }
  return [];
};

export const saveUserLogs = (logs: LogEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    const logsToStore = logs.map(log => ({
      ...log,
      date: log.date.toISOString(),
      focusLevel: typeof log.focusLevel === 'number' && log.focusLevel >= 1 && log.focusLevel <= 5 ? log.focusLevel : undefined,
    }));
    localStorage.setItem(DAILY_LOG_STORAGE_KEY, JSON.stringify(logsToStore));
  } catch (e) {
    console.error("Error saving logs to localStorage:", e);
  }
};

// dataMode parameter is now ignored, always loads from user storage
export async function getDailyLogs(dataMode?: 'mock' | 'user'): Promise<LogEntry[]> {
  return loadUserLogs();
}

export const addUserLog = (newLogData: Omit<LogEntry, 'id'>): LogEntry => {
    const userLogs = loadUserLogs();
    const newLog: LogEntry = {
        ...newLogData,
        id: crypto.randomUUID(),
        focusLevel: typeof newLogData.focusLevel === 'number' && newLogData.focusLevel >= 1 && newLogData.focusLevel <= 5
            ? newLogData.focusLevel
            : undefined,
    };
    const updatedLogs = [newLog, ...userLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveUserLogs(updatedLogs);
    return newLog;
}

export const updateUserLog = (updatedLog: LogEntry): LogEntry | undefined => {
     if (!updatedLog.id) return undefined;
     const userLogs = loadUserLogs();
     let found = false;
     const updatedLogs = userLogs.map(log => {
         if (log.id === updatedLog.id) {
             found = true;
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
         return updatedLog; 
     }
     return undefined;
}

export const deleteUserLog = (logId: string): boolean => {
    const userLogs = loadUserLogs();
    const updatedLogs = userLogs.filter(log => log.id !== logId);
    if (updatedLogs.length < userLogs.length) {
        saveUserLogs(updatedLogs);
        return true;
    }
    return false;
}
