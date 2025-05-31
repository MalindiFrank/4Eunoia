
'use client';

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader';

export const REMINDER_STORAGE_KEY = 'prodev-reminders';

export interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  description?: string;
}

const loadUserReminders = (): Reminder[] => {
  if (typeof window === 'undefined') return [];
  const storedReminders = localStorage.getItem(REMINDER_STORAGE_KEY);
  if (storedReminders) {
    try {
      const parsedReminders = JSON.parse(storedReminders).map((reminder: any) => ({
        ...reminder,
        dateTime: parseISO(reminder.dateTime),
      }));
       const now = new Date();
        return parsedReminders
            .filter((r: Reminder) => r.dateTime >= now)
            .sort((a: Reminder, b: Reminder) => a.dateTime.getTime() - b.dateTime.getTime());
    } catch (e) {
      console.error("Error parsing reminders from localStorage:", e);
      return [];
    }
  }
  return [];
};

export const saveUserReminders = (reminders: Reminder[]) => {
   if (typeof window === 'undefined') return;
  try {
    const remindersToStore = reminders.map(reminder => ({
      ...reminder,
      dateTime: reminder.dateTime.toISOString(),
    }));
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(remindersToStore));
  } catch (e) {
    console.error("Error saving reminders to localStorage:", e);
  }
};

// dataMode parameter is now ignored, always loads from user storage
export async function getUpcomingReminders(dataMode?: 'mock' | 'user'): Promise<Reminder[]> {
  return loadUserReminders();
}

export const addUserReminder = (newReminderData: Omit<Reminder, 'id'>): Reminder => {
    if (typeof window === 'undefined') {
        console.error("Cannot add reminder outside client environment.");
        return { ...newReminderData, id: 'error-invalid-context', dateTime: new Date() };
    }
    const storedRemindersRaw = localStorage.getItem(REMINDER_STORAGE_KEY);
    let allUserReminders: Reminder[] = [];
    if (storedRemindersRaw) {
        try {
            allUserReminders = JSON.parse(storedRemindersRaw).map((r: any) => ({ ...r, dateTime: parseISO(r.dateTime) }));
        } catch (e) {
            console.error("Error parsing all reminders:", e);
        }
    }

    const newReminder: Reminder = {
        ...newReminderData,
        id: crypto.randomUUID(),
    };
    const updatedReminders = [...allUserReminders, newReminder].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    saveUserReminders(updatedReminders);
    return newReminder;
}

export const updateUserReminder = (updatedReminder: Reminder): Reminder | undefined => {
     if (!updatedReminder.id) return undefined;
      if (typeof window === 'undefined') return undefined; 
     const storedRemindersRaw = localStorage.getItem(REMINDER_STORAGE_KEY);
     let allUserReminders: Reminder[] = [];
     if (storedRemindersRaw) {
         try {
             allUserReminders = JSON.parse(storedRemindersRaw).map((r: any) => ({ ...r, dateTime: parseISO(r.dateTime) }));
         } catch (e) {
             console.error("Error parsing all reminders:", e);
             return undefined;
         }
     }

     let found = false;
     const updatedReminders = allUserReminders.map(reminder => {
         if (reminder.id === updatedReminder.id) {
             found = true;
             return updatedReminder;
         }
         return reminder;
     }).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

     if (found) {
         saveUserReminders(updatedReminders);
         return updatedReminder;
     }
     return undefined;
}

export const deleteUserReminder = (reminderId: string): boolean => {
     if (typeof window === 'undefined') return false; 
    const storedRemindersRaw = localStorage.getItem(REMINDER_STORAGE_KEY);
    let allUserReminders: Reminder[] = [];
    if (storedRemindersRaw) {
         try {
            allUserReminders = JSON.parse(storedRemindersRaw).map((r: any) => ({ ...r, dateTime: parseISO(r.dateTime) }));
         } catch (e) {
            console.error("Error parsing all reminders:", e);
            return false;
         }
    }

    const updatedReminders = allUserReminders.filter(reminder => reminder.id !== reminderId);
    if (updatedReminders.length < allUserReminders.length) {
        saveUserReminders(updatedReminders);
        return true;
    }
    return false;
}
