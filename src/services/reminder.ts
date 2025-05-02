'use client';

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

// Local storage key
export const REMINDER_STORAGE_KEY = 'prodev-reminders';

/**
 * Represents a reminder.
 */
export interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  description?: string;
}

// Function to load reminders from localStorage
const loadUserReminders = (): Reminder[] => {
  if (typeof window === 'undefined') return [];
  const storedReminders = localStorage.getItem(REMINDER_STORAGE_KEY);
  if (storedReminders) {
    try {
      const parsedReminders = JSON.parse(storedReminders).map((reminder: any) => ({
        ...reminder,
        dateTime: parseISO(reminder.dateTime),
      }));
       // Filter out past reminders and sort
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

// Function to save reminders to localStorage
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


// Function to fetch upcoming reminders based on data mode
export async function getUpcomingReminders(dataMode: 'mock' | 'user'): Promise<Reminder[]> {
  if (dataMode === 'user') {
    // Load and filter from localStorage
    return loadUserReminders(); // Already filters past
  } else {
     // Load mock data and filter past
     const mockRemindersRaw = await loadMockData<any>('reminders');
     const now = new Date();
     return mockRemindersRaw
       .map(reminder => ({
         ...reminder,
         dateTime: parseISO(reminder.dateTime),
       }))
       .filter(r => r.dateTime >= now) // Filter past mock reminders
       .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }
}

// Function to add a new user reminder
export const addUserReminder = (newReminderData: Omit<Reminder, 'id'>): Reminder => {
    // Fetch *all* reminders from storage, not just upcoming, to avoid losing past ones
    if (typeof window === 'undefined') {
        // Handle server-side or return an error/empty object
        console.error("Cannot add reminder outside client environment.");
        // This is a temporary fix, ideally this function shouldn't be called server-side
        // or should handle it gracefully.
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


// Function to update a user reminder
export const updateUserReminder = (updatedReminder: Reminder): Reminder | undefined => {
     if (!updatedReminder.id) return undefined;
     // Fetch *all* reminders from storage
      if (typeof window === 'undefined') return undefined; // Add guard
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

// Function to delete a user reminder
export const deleteUserReminder = (reminderId: string): boolean => {
    // Fetch *all* reminders from storage
     if (typeof window === 'undefined') return false; // Add guard
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
