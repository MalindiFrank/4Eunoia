
import {
    getExpenses,
    saveUserExpenses,
    addUserExpense,
    updateUserExpense,
    deleteUserExpense,
    type Expense,
    EXPENSE_STORAGE_KEY
} from '@/services/expense';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'expenses') {
      return Promise.resolve([
        { id: 'mock1', description: 'Mock Coffee', amount: 5.00, date: new Date(2024, 5, 10).toISOString(), category: 'Food' },
        { id: 'mock2', description: 'Mock Gas', amount: 50.00, date: new Date(2024, 5, 9).toISOString(), category: 'Transport' },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Expense Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getExpenses', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const expenses = await getExpenses('mock');
      expect(expenses.length).toBe(2);
      expect(expenses[0].description).toBe('Mock Coffee');
      expect(expenses[0].date).toBeInstanceOf(Date);
      expect(expenses[0].amount).toBe(5.00);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('expenses');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userExpenses: Expense[] = [
        { id: 'user1', description: 'User Lunch', amount: 15.75, date: new Date(2024, 5, 12), category: 'Food' },
      ];
      saveUserExpenses(userExpenses);

      const expenses = await getExpenses('user');
      expect(expenses.length).toBe(1);
      expect(expenses[0].description).toBe('User Lunch');
      expect(expenses[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const expenses = await getExpenses('user');
        expect(expenses).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(EXPENSE_STORAGE_KEY, 'not json');
        const expenses = await getExpenses('user');
        expect(expenses).toEqual([]);
     });

      it('should sort expenses by date descending', async () => {
          const userExpenses: Expense[] = [
            { id: 'user1', description: 'Older', amount: 10, date: new Date(2024, 5, 10), category: 'Other' },
            { id: 'user2', description: 'Newer', amount: 20, date: new Date(2024, 5, 12), category: 'Other' },
          ];
          saveUserExpenses(userExpenses);
          const expenses = await getExpenses('user');
          expect(expenses.length).toBe(2);
          expect(expenses[0].id).toBe('user2'); // Newer first
          expect(expenses[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserExpense should add an expense to localStorage', () => {
      const newExpenseData = { description: 'New Expense', amount: 9.99, date: new Date(), category: 'Shopping' };
      const addedExpense = addUserExpense(newExpenseData);

      expect(addedExpense.id).toBeDefined();
      expect(addedExpense.description).toBe('New Expense');
      expect(addedExpense.amount).toBe(9.99);

      const storedExpenses = JSON.parse(localStorage.getItem(EXPENSE_STORAGE_KEY) || '[]');
      expect(storedExpenses.length).toBe(1);
      expect(storedExpenses[0].description).toBe('New Expense');
      expect(storedExpenses[0].id).toBe(addedExpense.id);
    });

    it('updateUserExpense should update an existing expense in localStorage', () => {
       const initialExpense = addUserExpense({ description: 'Initial', amount: 10, date: new Date(), category: 'Other' });
       const updatedData: Expense = { ...initialExpense, amount: 15.50, description: 'Updated Desc' };

       const result = updateUserExpense(updatedData);
       expect(result).toBeDefined();
       expect(result?.description).toBe('Updated Desc');
       expect(result?.amount).toBe(15.50);

        const storedExpenses = JSON.parse(localStorage.getItem(EXPENSE_STORAGE_KEY) || '[]');
        expect(storedExpenses.length).toBe(1);
        expect(storedExpenses[0].description).toBe('Updated Desc');
        expect(storedExpenses[0].amount).toBe(15.50);
        expect(storedExpenses[0].id).toBe(initialExpense.id);
    });

     it('updateUserExpense should return undefined if expense ID not found', () => {
       addUserExpense({ description: 'Existing', amount: 5, date: new Date(), category: 'Other' });
       const nonExistentUpdate: Expense = { id: 'non-existent-id', description: 'Wont Update', amount: 1, date: new Date(), category: 'Other' };
       const result = updateUserExpense(nonExistentUpdate);
       expect(result).toBeUndefined();
       const storedExpenses = JSON.parse(localStorage.getItem(EXPENSE_STORAGE_KEY) || '[]');
       expect(storedExpenses.length).toBe(1);
       expect(storedExpenses[0].description).toBe('Existing');
     });

     it('deleteUserExpense should remove an expense from localStorage', () => {
        const expense1 = addUserExpense({ description: 'Expense 1', amount: 1, date: new Date(), category: 'Other' });
        const expense2 = addUserExpense({ description: 'Expense 2', amount: 2, date: new Date(), category: 'Other' });

        const success = deleteUserExpense(expense1.id!);
        expect(success).toBe(true);

        const storedExpenses = JSON.parse(localStorage.getItem(EXPENSE_STORAGE_KEY) || '[]');
        expect(storedExpenses.length).toBe(1);
        expect(storedExpenses[0].id).toBe(expense2.id);
     });

      it('deleteUserExpense should return false if expense ID not found', () => {
         addUserExpense({ description: 'Existing', amount: 1, date: new Date(), category: 'Other' });
         const success = deleteUserExpense('non-existent-id');
         expect(success).toBe(false);
          const storedExpenses = JSON.parse(localStorage.getItem(EXPENSE_STORAGE_KEY) || '[]');
         expect(storedExpenses.length).toBe(1);
      });
  });
});
