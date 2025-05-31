
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

export const EXPENSE_STORAGE_KEY = 'prodev-expenses';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: string;
}

const firebaseDataToExpensesArray = (data: any): Expense[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, expenseData]: [string, any]) => ({
      id,
      ...(expenseData as Omit<Expense, 'id' | 'date'>),
      date: parseISO(expenseData.date),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const loadUserExpensesFromLocalStorage = (): Expense[] => {
  if (typeof window === 'undefined') return [];
  const storedExpenses = localStorage.getItem(EXPENSE_STORAGE_KEY);
  if (storedExpenses) {
    try {
      const parsedExpenses = JSON.parse(storedExpenses).map((expense: any) => ({
        ...expense,
        date: parseISO(expense.date),
      }));
      return parsedExpenses.sort((a: Expense, b: Expense) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.error("Error parsing expenses from localStorage:", e);
      return [];
    }
  }
  return [];
};

const saveUserExpensesToLocalStorage = (expenses: Expense[]) => {
   if (typeof window === 'undefined') return;
  try {
    const expensesToStore = expenses.map(expense => ({
      ...expense,
      date: expense.date.toISOString(),
    }));
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expensesToStore));
  } catch (e) {
    console.error("Error saving expenses to localStorage:", e);
  }
};

export async function getExpenses(): Promise<Expense[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const expensesRef = ref(db, `users/${currentUser.uid}/expenses`);
      const snapshot = await get(expensesRef);
      if (snapshot.exists()) {
        return firebaseDataToExpensesArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching expenses from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserExpensesFromLocalStorage();
  }
}

export const addUserExpense = async (newExpenseData: Omit<Expense, 'id'>): Promise<Expense> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const expensesRef = ref(db, `users/${currentUser.uid}/expenses`);
        const newExpenseRef = push(expensesRef);
        const newExpense: Expense = {
            ...newExpenseData,
            id: newExpenseRef.key!,
        };
        const dataToSave = {
            ...newExpenseData,
            date: newExpenseData.date.toISOString(),
        };
        await set(newExpenseRef, dataToSave);
        return newExpense;
    } else {
        const userExpenses = loadUserExpensesFromLocalStorage();
        const newLocalExpense: Expense = {
            ...newExpenseData,
            id: crypto.randomUUID(),
        };
        const updatedExpenses = [newLocalExpense, ...userExpenses].sort((a, b) => b.date.getTime() - a.date.getTime());
        saveUserExpensesToLocalStorage(updatedExpenses);
        return newLocalExpense;
    }
};

export const updateUserExpense = async (updatedExpenseData: Expense): Promise<Expense | undefined> => {
    if (!updatedExpenseData.id) return undefined;
    const currentUser = auth.currentUser;
    const dataToSave = {
        description: updatedExpenseData.description,
        amount: updatedExpenseData.amount,
        date: updatedExpenseData.date.toISOString(),
        category: updatedExpenseData.category,
    };

    if (currentUser) {
        const expenseRef = ref(db, `users/${currentUser.uid}/expenses/${updatedExpenseData.id}`);
        await set(expenseRef, dataToSave);
        return updatedExpenseData;
    } else {
        const userExpenses = loadUserExpensesFromLocalStorage();
        let found = false;
        const updatedExpenses = userExpenses.map(expense => {
            if (expense.id === updatedExpenseData.id) {
                found = true;
                return updatedExpenseData;
            }
            return expense;
        }).sort((a, b) => b.date.getTime() - a.date.getTime());

        if (found) {
            saveUserExpensesToLocalStorage(updatedExpenses);
            return updatedExpenseData;
        }
        return undefined;
    }
};

export const deleteUserExpense = async (expenseId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const expenseRef = ref(db, `users/${currentUser.uid}/expenses/${expenseId}`);
        await remove(expenseRef);
        return true;
    } else {
        const userExpenses = loadUserExpensesFromLocalStorage();
        const updatedExpenses = userExpenses.filter(expense => expense.id !== expenseId);
        if (updatedExpenses.length < userExpenses.length) {
            saveUserExpensesToLocalStorage(updatedExpenses);
            return true;
        }
        return false;
    }
};

export { saveUserExpensesToLocalStorage as saveUserExpenses };
