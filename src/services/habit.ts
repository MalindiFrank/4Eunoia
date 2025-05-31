
'use client';

import { parseISO, startOfDay, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

export type HabitFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Specific Days';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  specificDays?: number[]; // For 'Specific Days' frequency, e.g., [1, 3, 5] for Mon, Wed, Fri
  streak: number;
  lastCompleted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const HABITS_STORAGE_KEY = 'prodev-habits';
const dateFields: (keyof Habit)[] = ['lastCompleted', 'createdAt', 'updatedAt'];

const firebaseDataToHabitsArray = (data: any): Habit[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, habitData]: [string, any]) => {
      const newItem: Partial<Habit> = { id, ...(habitData as Omit<Habit, 'id'>) };
      dateFields.forEach(field => {
        if (habitData[field]) {
          newItem[field] = parseISO(habitData[field] as string);
        }
      });
      return newItem as Habit;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

const loadUserHabitsFromLocalStorage = (): Habit[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(HABITS_STORAGE_KEY);
  if (storedData) {
    try {
      const parsedData = JSON.parse(storedData).map((item: any) => {
        const newItem: Partial<Habit> = { ...item };
        dateFields.forEach(field => {
          if (newItem[field]) {
            newItem[field] = parseISO(newItem[field] as string);
          }
        });
        return newItem as Habit;
      });
      return parsedData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (e) {
      console.error(`Error parsing ${HABITS_STORAGE_KEY} from localStorage:`, e);
      return [];
    }
  }
  return [];
};

const saveUserHabitsToLocalStorage = (habits: Habit[]) => {
  if (typeof window === 'undefined') return;
  try {
    const dataToStore = habits.map(item => {
      const newItem: any = { ...item };
      dateFields.forEach(field => {
        const dateValue = newItem[field] as Date | undefined;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          newItem[field] = dateValue.toISOString();
        }
      });
      return newItem;
    });
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (e) {
    console.error(`Error saving ${HABITS_STORAGE_KEY} to localStorage:`, e);
  }
};

export async function getHabits(): Promise<Habit[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const habitsRef = ref(db, `users/${currentUser.uid}/habits`);
      const snapshot = await get(habitsRef);
      if (snapshot.exists()) {
        return firebaseDataToHabitsArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching habits from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserHabitsFromLocalStorage();
  }
}

export const addUserHabit = async (newHabitData: Omit<Habit, 'id' | 'streak' | 'createdAt' | 'updatedAt'>): Promise<Habit> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    if (currentUser) {
        const habitsRef = ref(db, `users/${currentUser.uid}/habits`);
        const newHabitRef = push(habitsRef);
        const newHabit: Habit = {
            ...newHabitData,
            id: newHabitRef.key!,
            streak: 0,
            createdAt: now,
            updatedAt: now,
        };
        const dataToSave = {
            title: newHabitData.title,
            description: newHabitData.description,
            frequency: newHabitData.frequency,
            specificDays: newHabitData.specificDays,
            streak: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            lastCompleted: undefined, // ensure it's undefined or null
        };
        await set(newHabitRef, dataToSave);
        return newHabit;
    } else {
        const userHabits = loadUserHabitsFromLocalStorage();
        const newLocalHabit: Habit = {
            ...newHabitData,
            id: crypto.randomUUID(),
            streak: 0,
            createdAt: now,
            updatedAt: now,
        };
        const updatedHabits = [newLocalHabit, ...userHabits].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        saveUserHabitsToLocalStorage(updatedHabits);
        return newLocalHabit;
    }
};

export const updateUserHabit = async (updatedHabitData: Partial<Habit> & { id: string }): Promise<Habit | undefined> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    let fullUpdatedHabit: Habit;

    if (currentUser) {
        const habitRef = ref(db, `users/${currentUser.uid}/habits/${updatedHabitData.id}`);
        const snapshot = await get(habitRef);
        if (!snapshot.exists()) return undefined;
        const existingHabitData = snapshot.val();
        fullUpdatedHabit = {
            ...(existingHabitData as Omit<Habit, 'id'>), // Cast carefully
            id: updatedHabitData.id,
            createdAt: parseISO(existingHabitData.createdAt),
            lastCompleted: existingHabitData.lastCompleted ? parseISO(existingHabitData.lastCompleted) : undefined,
            ...updatedHabitData,
            updatedAt: now,
        };
        const dataToSave = {
            title: fullUpdatedHabit.title,
            description: fullUpdatedHabit.description,
            frequency: fullUpdatedHabit.frequency,
            specificDays: fullUpdatedHabit.specificDays,
            streak: fullUpdatedHabit.streak,
            lastCompleted: fullUpdatedHabit.lastCompleted?.toISOString(),
            createdAt: fullUpdatedHabit.createdAt.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(habitRef, dataToSave);
        return fullUpdatedHabit;
    } else {
        const userHabits = loadUserHabitsFromLocalStorage();
        let found = false;
        const updatedHabits = userHabits.map(habit => {
            if (habit.id === updatedHabitData.id) {
                found = true;
                fullUpdatedHabit = { ...habit, ...updatedHabitData, updatedAt: now };
                return fullUpdatedHabit;
            }
            return habit;
        }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        if (found) {
            saveUserHabitsToLocalStorage(updatedHabits);
            return fullUpdatedHabit!;
        }
        return undefined;
    }
};

export const deleteUserHabit = async (habitId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const habitRef = ref(db, `users/${currentUser.uid}/habits/${habitId}`);
        await remove(habitRef);
        return true;
    } else {
        const userHabits = loadUserHabitsFromLocalStorage();
        const updatedHabits = userHabits.filter(habit => habit.id !== habitId);
        if (updatedHabits.length < userHabits.length) {
            saveUserHabitsToLocalStorage(updatedHabits);
            return true;
        }
        return false;
    }
};

export const markUserHabitComplete = async (habitId: string): Promise<Habit | null> => {
    const currentUser = auth.currentUser;
    const today = startOfDay(new Date());
    let habitToUpdate: Habit | undefined;

    if (currentUser) {
        const habitRef = ref(db, `users/${currentUser.uid}/habits/${habitId}`);
        const snapshot = await get(habitRef);
        if (!snapshot.exists()) return null;
        const existingHabitData = snapshot.val();
        habitToUpdate = {
            id: habitId,
            ...(existingHabitData as Omit<Habit, 'id'>),
            createdAt: parseISO(existingHabitData.createdAt),
            lastCompleted: existingHabitData.lastCompleted ? parseISO(existingHabitData.lastCompleted) : undefined,
        };

        if (!habitToUpdate.lastCompleted || startOfDay(habitToUpdate.lastCompleted) < today) {
            const updatedStreak = (habitToUpdate.streak || 0) + 1;
            const completedHabit = { ...habitToUpdate, streak: updatedStreak, lastCompleted: new Date(), updatedAt: new Date() };
            const dataToSave = {
                ...completedHabit,
                id: undefined,
                createdAt: completedHabit.createdAt.toISOString(),
                lastCompleted: completedHabit.lastCompleted?.toISOString(),
                updatedAt: completedHabit.updatedAt.toISOString(),
            };
            delete dataToSave.id;
            await set(habitRef, dataToSave);
            return completedHabit;
        }
        return null; // Already completed today
    } else {
        const userHabits = loadUserHabitsFromLocalStorage();
        habitToUpdate = userHabits.find(h => h.id === habitId);
        if (habitToUpdate && (!habitToUpdate.lastCompleted || startOfDay(habitToUpdate.lastCompleted) < today)) {
            const updatedStreak = (habitToUpdate.streak || 0) + 1;
            const completedHabit = { ...habitToUpdate, streak: updatedStreak, lastCompleted: new Date(), updatedAt: new Date() };
            const updatedList = userHabits.map(h => h.id === habitId ? completedHabit : h);
            saveUserHabitsToLocalStorage(updatedList);
            return completedHabit;
        }
        return null; // Already completed today or not found
    }
};

export { saveUserHabitsToLocalStorage as saveUserHabits };
