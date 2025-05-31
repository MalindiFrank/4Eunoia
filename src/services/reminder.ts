
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove, query, orderByChild, startAt } from 'firebase/database';

export const REMINDER_STORAGE_KEY = 'prodev-reminders';

export interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  description?: string;
}

const firebaseDataToRemindersArray = (data: any): Reminder[] => {
  if (!data) return [];
  const now = new Date().toISOString();
  return Object.entries(data)
    .map(([id, reminderData]: [string, any]) => ({
      id,
      ...(reminderData as Omit<Reminder, 'id' | 'dateTime'>),
      dateTime: parseISO(reminderData.dateTime),
    }))
    .filter(r => r.dateTime.toISOString() >= now) // Filter for upcoming
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
};

const loadUserRemindersFromLocalStorage = (): Reminder[] => {
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

const saveUserRemindersToLocalStorage = (reminders: Reminder[]) => {
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

export async function getUpcomingReminders(): Promise<Reminder[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const remindersBaseRef = ref(db, `users/${currentUser.uid}/reminders`);
      // Query for reminders with dateTime >= now
      const nowISO = new Date().toISOString();
      const upcomingQuery = query(remindersBaseRef, orderByChild('dateTime'), startAt(nowISO));
      const snapshot = await get(upcomingQuery);

      if (snapshot.exists()) {
        // Firebase orderByChild returns an object, needs conversion and client-side sort if order isn't guaranteed perfectly
        return firebaseDataToRemindersArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching upcoming reminders from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserRemindersFromLocalStorage();
  }
}

export const addUserReminder = async (newReminderData: Omit<Reminder, 'id'>): Promise<Reminder> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const remindersRef = ref(db, `users/${currentUser.uid}/reminders`);
        const newReminderRef = push(remindersRef);
        const newReminder: Reminder = {
            ...newReminderData,
            id: newReminderRef.key!,
        };
        const dataToSave = {
            title: newReminderData.title,
            dateTime: newReminderData.dateTime.toISOString(),
            description: newReminderData.description,
        };
        await set(newReminderRef, dataToSave);
        return newReminder;
    } else {
        // For localStorage, we load all, add, then save all to maintain sort and filter logic in one place.
        const allUserReminders = loadUserRemindersFromLocalStorage(); // This already filters and sorts
        const newLocalReminder: Reminder = {
            ...newReminderData,
            id: crypto.randomUUID(),
        };
        const updatedReminders = [...allUserReminders, newLocalReminder]
            .filter(r => r.dateTime >= new Date())
            .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
        saveUserRemindersToLocalStorage(updatedReminders);
        return newLocalReminder;
    }
};

export const updateUserReminder = async (updatedReminderData: Reminder): Promise<Reminder | undefined> => {
    if (!updatedReminderData.id) return undefined;
    const currentUser = auth.currentUser;
    const dataToSave = {
        title: updatedReminderData.title,
        dateTime: updatedReminderData.dateTime.toISOString(),
        description: updatedReminderData.description,
    };

    if (currentUser) {
        const reminderRef = ref(db, `users/${currentUser.uid}/reminders/${updatedReminderData.id}`);
        await set(reminderRef, dataToSave);
        return updatedReminderData;
    } else {
        const userReminders = loadUserRemindersFromLocalStorage();
        let found = false;
        const updatedReminders = userReminders.map(reminder => {
            if (reminder.id === updatedReminderData.id) {
                found = true;
                return updatedReminderData;
            }
            return reminder;
        }).filter(r => r.dateTime >= new Date())
          .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

        if (found) {
            saveUserRemindersToLocalStorage(updatedReminders);
            return updatedReminderData;
        }
        return undefined;
    }
};

export const deleteUserReminder = async (reminderId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const reminderRef = ref(db, `users/${currentUser.uid}/reminders/${reminderId}`);
        await remove(reminderRef);
        return true;
    } else {
        const userReminders = loadUserRemindersFromLocalStorage();
        const updatedReminders = userReminders.filter(reminder => reminder.id !== reminderId);
        // No need to re-filter/sort as loadUserReminders already does it.
        // We just check if an item was actually removed.
        if (updatedReminders.length < userReminders.length) {
            saveUserRemindersToLocalStorage(updatedReminders);
            return true;
        }
        // If lengths are same, it means the item wasn't in the "upcoming" list from localStorage
        // or it didn't exist. To be fully robust for general delete:
        const allStoredReminders = JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || '[]').map((r: any) => ({...r, dateTime: parseISO(r.dateTime)}));
        const trulyUpdated = allStoredReminders.filter((r: Reminder) => r.id !== reminderId);
        if (trulyUpdated.length < allStoredReminders.length) {
            saveUserRemindersToLocalStorage(trulyUpdated);
            return true;
        }
        return false;
    }
};

export { saveUserRemindersToLocalStorage as saveUserReminders };
