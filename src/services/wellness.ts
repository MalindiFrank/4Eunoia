'use client';

import { parseISO } from 'date-fns';

// --- Gratitude Logs ---
export const WELLNESS_GRATITUDE_STORAGE_KEY = '4eunoia-wellness-gratitude';

export interface GratitudeLog {
  id: string;
  text: string;
  timestamp: Date;
}

const loadGratitudeLogs = (): GratitudeLog[] => {
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

const saveGratitudeLogs = (logs: GratitudeLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WELLNESS_GRATITUDE_STORAGE_KEY, JSON.stringify(
    logs.map(log => ({ ...log, timestamp: log.timestamp.toISOString() }))
  ));
};

export const getGratitudeLogs = (): GratitudeLog[] => {
  return loadGratitudeLogs();
};

export const addGratitudeLog = (newLogData: Omit<GratitudeLog, 'id'>): GratitudeLog => {
  const logs = loadGratitudeLogs();
  const newLog: GratitudeLog = {
    ...newLogData,
    id: crypto.randomUUID(),
  };
  const updatedLogs = [newLog, ...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  saveGratitudeLogs(updatedLogs);
  return newLog;
};

// --- Reframing Logs ---
export const WELLNESS_REFRAMING_STORAGE_KEY = '4eunoia-wellness-reframing';

export interface ReframingLog {
  id: string;
  negativeThought: string;
  positiveReframing: string;
  timestamp: Date;
}

const loadReframingLogs = (): ReframingLog[] => {
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

const saveReframingLogs = (logs: ReframingLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WELLNESS_REFRAMING_STORAGE_KEY, JSON.stringify(
    logs.map(log => ({ ...log, timestamp: log.timestamp.toISOString() }))
  ));
};

export const getReframingLogs = (): ReframingLog[] => {
  return loadReframingLogs();
};

export const addReframingLog = (newLogData: Omit<ReframingLog, 'id'>): ReframingLog => {
  const logs = loadReframingLogs();
  const newLog: ReframingLog = {
    ...newLogData,
    id: crypto.randomUUID(),
  };
  const updatedLogs = [newLog, ...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  saveReframingLogs(updatedLogs);
  return newLog;
};
