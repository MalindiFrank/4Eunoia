'use client';

import { parseISO, startOfDay } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

export type HabitFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Specific Days';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  specificDays?: number[];
  streak: number;
  lastCompleted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Local storage key
export const HABITS_STORAGE_KEY = 'prodev-habits';
const dateFields: (keyof Habit)[] = ['lastCompleted', 'createdAt', 'updatedAt'];

// Function to load habits from localStorage
const loadUserHabits = (): Habit[] => {
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

// Function to save habits to localStorage
export const saveUserHabits = (habits: Habit[]) => {
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

// Function to fetch habits based on data mode
export async function getHabits(dataMode: 'mock' | 'user'): Promise<Habit[]> {
  if (dataMode === 'user') {
    return loadUserHabits();
  } else {
    const mockDataRaw = await loadMockData<any>('habits');
    return mockDataRaw.map(habit => ({
      ...habit,
      lastCompleted: habit.lastCompleted ? parseISO(habit.lastCompleted) : undefined,
      createdAt: parseISO(habit.createdAt),
      updatedAt: parseISO(habit.updatedAt),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

// Function to add a new user habit
export const addUserHabit = (newHabitData: Omit<Habit, 'id' | 'streak' | 'createdAt' | 'updatedAt'>): Habit => {
    const userHabits = loadUserHabits();
    const now = new Date();
    const newHabit: Habit = {
        ...newHabitData,
        id: crypto.randomUUID(),
        streak: 0,
        createdAt: now,
        updatedAt: now,
    };
    const updatedHabits = [newHabit, ...userHabits].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    saveUserHabits(updatedHabits);
    return newHabit;
}

// Function to update a user habit
export const updateUserHabit = (updatedHabitData: Partial<Habit> & { id: string }): Habit | undefined => {
    const userHabits = loadUserHabits();
    let updatedHabit: Habit | undefined = undefined;
    const now = new Date();
    const updatedHabits = userHabits.map(habit => {
        if (habit.id === updatedHabitData.id) {
            // Ensure streak and lastCompleted aren't accidentally overwritten if not provided
            updatedHabit = { ...habit, ...updatedHabitData, updatedAt: now };
            return updatedHabit;
        }
        return habit;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (updatedHabit) {
        saveUserHabits(updatedHabits);
    }
    return updatedHabit;
}

// Function to delete a user habit
export const deleteUserHabit = (habitId: string): boolean => {
    const userHabits = loadUserHabits();
    const updatedHabits = userHabits.filter(habit => habit.id !== habitId);
    if (updatedHabits.length < userHabits.length) {
        saveUserHabits(updatedHabits);
        return true;
    }
    return false;
}

// Function to mark a habit as complete (simplified version)
export const markUserHabitComplete = (habitId: string): Habit | null => {
    const userHabits = loadUserHabits();
    const today = startOfDay(new Date());
    let habitUpdated = false;
    let completedHabit: Habit | null = null;

    const updatedHabits = userHabits.map(h => {
        if (h.id === habitId) {
            // Crude check: only update if not completed today already
            if (!h.lastCompleted || startOfDay(h.lastCompleted) < today) {
                habitUpdated = true;
                 completedHabit = { ...h, streak: (h.streak || 0) + 1, lastCompleted: new Date(), updatedAt: new Date() };
                 return completedHabit;
            }
        }
        return h;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (habitUpdated) {
        saveUserHabits(updatedHabits);
        return completedHabit; // Return the updated habit
    }
    return null; // Return null if it wasn't updated (already completed today)
}
