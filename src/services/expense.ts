
'use client';

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader';

export const EXPENSE_STORAGE_KEY = 'prodev-expenses';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: string;
}

const loadUserExpenses = (): Expense[] => {
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

export const saveUserExpenses = (expenses: Expense[]) => {
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

// dataMode parameter is now ignored, always loads from user storage
export async function getExpenses(dataMode?: 'mock' | 'user'): Promise<Expense[]> {
  return loadUserExpenses();
}

export const addUserExpense = (newExpenseData: Omit<Expense, 'id'>): Expense => {
    const userExpenses = loadUserExpenses();
    const newExpense: Expense = {
        ...newExpenseData,
        id: crypto.randomUUID(),
    };
    const updatedExpenses = [newExpense, ...userExpenses].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveUserExpenses(updatedExpenses);
    return newExpense;
}

export const updateUserExpense = (updatedExpense: Expense): Expense | undefined => {
    if (!updatedExpense.id) return undefined;
    const userExpenses = loadUserExpenses();
    let found = false;
    const updatedExpenses = userExpenses.map(expense => {
        if (expense.id === updatedExpense.id) {
            found = true;
            return updatedExpense;
        }
        return expense;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

    if (found) {
        saveUserExpenses(updatedExpenses);
        return updatedExpense;
    }
    return undefined;
}

export const deleteUserExpense = (expenseId: string): boolean => {
    const userExpenses = loadUserExpenses();
    const updatedExpenses = userExpenses.filter(expense => expense.id !== expenseId);
    if (updatedExpenses.length < userExpenses.length) {
        saveUserExpenses(updatedExpenses);
        return true;
    }
    return false;
}
