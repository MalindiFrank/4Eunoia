'use client';

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

export type GoalStatus = 'Not Started' | 'In Progress' | 'Achieved' | 'On Hold';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  targetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Local storage key
export const GOALS_STORAGE_KEY = 'prodev-goals';
const dateFields: (keyof Goal)[] = ['targetDate', 'createdAt', 'updatedAt'];

// Function to load goals from localStorage
const loadUserGoals = (): Goal[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(GOALS_STORAGE_KEY);
  if (storedData) {
    try {
      const parsedData = JSON.parse(storedData).map((item: any) => {
        const newItem: Partial<Goal> = { ...item };
        dateFields.forEach(field => {
          if (newItem[field]) {
            newItem[field] = parseISO(newItem[field] as string);
          }
        });
        return newItem as Goal;
      });
      return parsedData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (e) {
      console.error(`Error parsing ${GOALS_STORAGE_KEY} from localStorage:`, e);
      return [];
    }
  }
  return [];
};

// Function to save goals to localStorage
export const saveUserGoals = (goals: Goal[]) => {
  if (typeof window === 'undefined') return;
  try {
    const dataToStore = goals.map(item => {
      const newItem: any = { ...item };
      dateFields.forEach(field => {
        const dateValue = newItem[field] as Date | undefined;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          newItem[field] = dateValue.toISOString();
        }
      });
      return newItem;
    });
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (e) {
    console.error(`Error saving ${GOALS_STORAGE_KEY} to localStorage:`, e);
  }
};

// Function to fetch goals based on data mode
export async function getGoals(dataMode: 'mock' | 'user'): Promise<Goal[]> {
  if (dataMode === 'user') {
    return loadUserGoals();
  } else {
    const mockDataRaw = await loadMockData<any>('goals');
    return mockDataRaw.map(goal => ({
      ...goal,
      targetDate: goal.targetDate ? parseISO(goal.targetDate) : undefined,
      createdAt: parseISO(goal.createdAt),
      updatedAt: parseISO(goal.updatedAt),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

// Function to add a new user goal
export const addUserGoal = (newGoalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal => {
    const userGoals = loadUserGoals();
    const now = new Date();
    const newGoal: Goal = {
        ...newGoalData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
    };
    const updatedGoals = [newGoal, ...userGoals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    saveUserGoals(updatedGoals);
    return newGoal;
}

// Function to update a user goal
export const updateUserGoal = (updatedGoalData: Partial<Goal> & { id: string }): Goal | undefined => {
    const userGoals = loadUserGoals();
    let updatedGoal: Goal | undefined = undefined;
    const now = new Date();
    const updatedGoals = userGoals.map(goal => {
        if (goal.id === updatedGoalData.id) {
            updatedGoal = { ...goal, ...updatedGoalData, updatedAt: now };
            return updatedGoal;
        }
        return goal;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (updatedGoal) {
        saveUserGoals(updatedGoals);
    }
    return updatedGoal;
}

// Function to delete a user goal
export const deleteUserGoal = (goalId: string): boolean => {
    const userGoals = loadUserGoals();
    const updatedGoals = userGoals.filter(goal => goal.id !== goalId);
    if (updatedGoals.length < userGoals.length) {
        saveUserGoals(updatedGoals);
        return true;
    }
    return false;
}
