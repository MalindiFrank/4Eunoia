
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

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

export const GOALS_STORAGE_KEY = 'prodev-goals';
const dateFields: (keyof Goal)[] = ['targetDate', 'createdAt', 'updatedAt'];

const firebaseDataToGoalsArray = (data: any): Goal[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, goalData]: [string, any]) => {
      const newItem: Partial<Goal> = { id, ...(goalData as Omit<Goal, 'id'>) };
      dateFields.forEach(field => {
        if (goalData[field]) {
          newItem[field] = parseISO(goalData[field] as string);
        }
      });
      return newItem as Goal;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

const loadUserGoalsFromLocalStorage = (): Goal[] => {
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

const saveUserGoalsToLocalStorage = (goals: Goal[]) => {
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

export async function getGoals(): Promise<Goal[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const goalsRef = ref(db, `users/${currentUser.uid}/goals`);
      const snapshot = await get(goalsRef);
      if (snapshot.exists()) {
        return firebaseDataToGoalsArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching goals from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserGoalsFromLocalStorage();
  }
}

export const addUserGoal = async (newGoalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    if (currentUser) {
        const goalsRef = ref(db, `users/${currentUser.uid}/goals`);
        const newGoalRef = push(goalsRef);
        const newGoal: Goal = {
            ...newGoalData,
            id: newGoalRef.key!,
            createdAt: now,
            updatedAt: now,
        };
        const dataToSave = {
            title: newGoalData.title,
            description: newGoalData.description,
            status: newGoalData.status,
            targetDate: newGoalData.targetDate?.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(newGoalRef, dataToSave);
        return newGoal;
    } else {
        const userGoals = loadUserGoalsFromLocalStorage();
        const newLocalGoal: Goal = {
            ...newGoalData,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        const updatedGoals = [newLocalGoal, ...userGoals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        saveUserGoalsToLocalStorage(updatedGoals);
        return newLocalGoal;
    }
};

export const updateUserGoal = async (updatedGoalData: Partial<Goal> & { id: string }): Promise<Goal | undefined> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    let fullUpdatedGoal: Goal;

    if (currentUser) {
        const goalRef = ref(db, `users/${currentUser.uid}/goals/${updatedGoalData.id}`);
        const snapshot = await get(goalRef);
        if (!snapshot.exists()) return undefined;
        const existingGoalData = snapshot.val();
        fullUpdatedGoal = {
            ...(existingGoalData as Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'targetDate'>), // Cast to ensure properties exist
            id: updatedGoalData.id,
            createdAt: parseISO(existingGoalData.createdAt), // Ensure createdAt is a Date
            ...updatedGoalData,
            targetDate: updatedGoalData.targetDate ? updatedGoalData.targetDate : (existingGoalData.targetDate ? parseISO(existingGoalData.targetDate) : undefined),
            updatedAt: now,
        };
         const dataToSave = {
            title: fullUpdatedGoal.title,
            description: fullUpdatedGoal.description,
            status: fullUpdatedGoal.status,
            targetDate: fullUpdatedGoal.targetDate?.toISOString(),
            createdAt: fullUpdatedGoal.createdAt.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(goalRef, dataToSave);
        return fullUpdatedGoal;
    } else {
        const userGoals = loadUserGoalsFromLocalStorage();
        let found = false;
        const updatedGoals = userGoals.map(goal => {
            if (goal.id === updatedGoalData.id) {
                found = true;
                fullUpdatedGoal = { ...goal, ...updatedGoalData, updatedAt: now };
                return fullUpdatedGoal;
            }
            return goal;
        }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        if (found) {
            saveUserGoalsToLocalStorage(updatedGoals);
            return fullUpdatedGoal!;
        }
        return undefined;
    }
};

export const deleteUserGoal = async (goalId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const goalRef = ref(db, `users/${currentUser.uid}/goals/${goalId}`);
        await remove(goalRef);
        return true;
    } else {
        const userGoals = loadUserGoalsFromLocalStorage();
        const updatedGoals = userGoals.filter(goal => goal.id !== goalId);
        if (updatedGoals.length < userGoals.length) {
            saveUserGoalsToLocalStorage(updatedGoals);
            return true;
        }
        return false;
    }
};

export { saveUserGoalsToLocalStorage as saveUserGoals };
