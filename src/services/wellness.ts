
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

// --- Gratitude Logs ---
export const WELLNESS_GRATITUDE_STORAGE_KEY = '4eunoia-wellness-gratitude';

export interface GratitudeLog {
  id: string;
  text: string;
  timestamp: Date;
}

const firebaseDataToGratitudeArray = (data: any): GratitudeLog[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, logData]: [string, any]) => ({
      id,
      ...(logData as Omit<GratitudeLog, 'id' | 'timestamp'>),
      timestamp: parseISO(logData.timestamp),
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const loadGratitudeLogsFromLocalStorage = (): GratitudeLog[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(WELLNESS_GRATITUDE_STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData).map((log: any) => ({
        ...log,
        timestamp: parseISO(log.timestamp),
      })).sort((a: GratitudeLog, b: GratitudeLog) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
      console.error("Error parsing gratitude logs:", e);
      return [];
    }
  }
  return [];
};

const saveGratitudeLogsToLocalStorage = (logs: GratitudeLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WELLNESS_GRATITUDE_STORAGE_KEY, JSON.stringify(
    logs.map(log => ({ ...log, timestamp: log.timestamp.toISOString() }))
  ));
};

export const getGratitudeLogs = async (): Promise<GratitudeLog[]> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const logsRef = ref(db, `users/${currentUser.uid}/wellness/gratitude`);
      const snapshot = await get(logsRef);
      return snapshot.exists() ? firebaseDataToGratitudeArray(snapshot.val()) : [];
    } catch (error) {
      console.error("Error fetching gratitude logs from Firebase:", error);
      throw error;
    }
  } else {
    return loadGratitudeLogsFromLocalStorage();
  }
};

export const addGratitudeLog = async (newLogData: Omit<GratitudeLog, 'id'>): Promise<GratitudeLog> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const logsRef = ref(db, `users/${currentUser.uid}/wellness/gratitude`);
    const newLogRef = push(logsRef);
    const newLog: GratitudeLog = { ...newLogData, id: newLogRef.key! };
    await set(newLogRef, { text: newLogData.text, timestamp: newLogData.timestamp.toISOString() });
    return newLog;
  } else {
    const logs = loadGratitudeLogsFromLocalStorage();
    const newLocalLog: GratitudeLog = { ...newLogData, id: crypto.randomUUID() };
    const updatedLogs = [newLocalLog, ...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    saveGratitudeLogsToLocalStorage(updatedLogs);
    return newLocalLog;
  }
};

// --- Reframing Logs ---
export const WELLNESS_REFRAMING_STORAGE_KEY = '4eunoia-wellness-reframing';

export interface ReframingLog {
  id: string;
  negativeThought: string;
  positiveReframing: string;
  timestamp: Date;
}

const firebaseDataToReframingArray = (data: any): ReframingLog[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, logData]: [string, any]) => ({
      id,
      ...(logData as Omit<ReframingLog, 'id' | 'timestamp'>),
      timestamp: parseISO(logData.timestamp),
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const loadReframingLogsFromLocalStorage = (): ReframingLog[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(WELLNESS_REFRAMING_STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData).map((log: any) => ({
        ...log,
        timestamp: parseISO(log.timestamp),
      })).sort((a: ReframingLog, b: ReframingLog) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
      console.error("Error parsing reframing logs:", e);
      return [];
    }
  }
  return [];
};

const saveReframingLogsToLocalStorage = (logs: ReframingLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WELLNESS_REFRAMING_STORAGE_KEY, JSON.stringify(
    logs.map(log => ({ ...log, timestamp: log.timestamp.toISOString() }))
  ));
};

export const getReframingLogs = async (): Promise<ReframingLog[]> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const logsRef = ref(db, `users/${currentUser.uid}/wellness/reframing`);
      const snapshot = await get(logsRef);
      return snapshot.exists() ? firebaseDataToReframingArray(snapshot.val()) : [];
    } catch (error) {
      console.error("Error fetching reframing logs from Firebase:", error);
      throw error;
    }
  } else {
    return loadReframingLogsFromLocalStorage();
  }
};

export const addReframingLog = async (newLogData: Omit<ReframingLog, 'id'>): Promise<ReframingLog> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const logsRef = ref(db, `users/${currentUser.uid}/wellness/reframing`);
    const newLogRef = push(logsRef);
    const newLog: ReframingLog = { ...newLogData, id: newLogRef.key! };
    await set(newLogRef, {
      negativeThought: newLogData.negativeThought,
      positiveReframing: newLogData.positiveReframing,
      timestamp: newLogData.timestamp.toISOString(),
    });
    return newLog;
  } else {
    const logs = loadReframingLogsFromLocalStorage();
    const newLocalLog: ReframingLog = { ...newLogData, id: crypto.randomUUID() };
    const updatedLogs = [newLocalLog, ...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    saveReframingLogsToLocalStorage(updatedLogs);
    return newLocalLog;
  }
};
