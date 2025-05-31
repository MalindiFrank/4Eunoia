
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

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

const firebaseDataToLogEntriesArray = (data: any): LogEntry[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, logData]: [string, any]) => ({
      id,
      ...(logData as Omit<LogEntry, 'id' | 'date'>),
      date: parseISO(logData.date),
      focusLevel: typeof logData.focusLevel === 'number' ? logData.focusLevel : undefined,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const loadUserLogsFromLocalStorage = (): LogEntry[] => {
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

const saveUserLogsToLocalStorage = (logs: LogEntry[]) => {
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

export async function getDailyLogs(): Promise<LogEntry[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const logsRef = ref(db, `users/${currentUser.uid}/dailyLogs`);
      const snapshot = await get(logsRef);
      if (snapshot.exists()) {
        return firebaseDataToLogEntriesArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching daily logs from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserLogsFromLocalStorage();
  }
}

export const addUserLog = async (newLogData: Omit<LogEntry, 'id'>): Promise<LogEntry> => {
  const currentUser = auth.currentUser;
  const logWithValidFocus = {
    ...newLogData,
    focusLevel: typeof newLogData.focusLevel === 'number' && newLogData.focusLevel >= 1 && newLogData.focusLevel <= 5
        ? newLogData.focusLevel
        : undefined,
  };

  if (currentUser) {
    const logsRef = ref(db, `users/${currentUser.uid}/dailyLogs`);
    const newLogRef = push(logsRef);
    const newLog: LogEntry = {
      ...logWithValidFocus,
      id: newLogRef.key!,
    };
    const dataToSave = {
      ...logWithValidFocus,
      date: newLogData.date.toISOString(),
    };
    await set(newLogRef, dataToSave);
    return newLog;
  } else {
    const userLogs = loadUserLogsFromLocalStorage();
    const newLocalLog: LogEntry = {
      ...logWithValidFocus,
      id: crypto.randomUUID(),
    };
    const updatedLogs = [newLocalLog, ...userLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveUserLogsToLocalStorage(updatedLogs);
    return newLocalLog;
  }
};

export const updateUserLog = async (updatedLogData: LogEntry): Promise<LogEntry | undefined> => {
  if (!updatedLogData.id) return undefined;
  const currentUser = auth.currentUser;
  const logWithValidFocus = {
    ...updatedLogData,
    id: undefined, // Don't save id as property in Firebase object
    focusLevel: typeof updatedLogData.focusLevel === 'number' && updatedLogData.focusLevel >= 1 && updatedLogData.focusLevel <= 5
        ? updatedLogData.focusLevel
        : undefined,
    date: updatedLogData.date.toISOString(),
  };
  delete logWithValidFocus.id;

  if (currentUser) {
    const logRef = ref(db, `users/${currentUser.uid}/dailyLogs/${updatedLogData.id}`);
    await set(logRef, logWithValidFocus);
    return updatedLogData;
  } else {
    const userLogs = loadUserLogsFromLocalStorage();
    let found = false;
    const updatedLogs = userLogs.map(log => {
      if (log.id === updatedLogData.id) {
        found = true;
        return { ...log, ...updatedLogData, focusLevel: logWithValidFocus.focusLevel };
      }
      return log;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

    if (found) {
      saveUserLogsToLocalStorage(updatedLogs);
      return updatedLogData;
    }
    return undefined;
  }
};

export const deleteUserLog = async (logId: string): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const logRef = ref(db, `users/${currentUser.uid}/dailyLogs/${logId}`);
    await remove(logRef);
    return true;
  } else {
    const userLogs = loadUserLogsFromLocalStorage();
    const updatedLogs = userLogs.filter(log => log.id !== logId);
    if (updatedLogs.length < userLogs.length) {
      saveUserLogsToLocalStorage(updatedLogs);
      return true;
    }
    return false;
  }
};

export { saveUserLogsToLocalStorage as saveUserLogs };
