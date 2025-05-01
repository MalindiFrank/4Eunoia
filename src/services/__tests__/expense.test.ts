import { getExpenses, Expense } from '@/services/expense'; // Adjust path as necessary

describe('Expense Service', () => {
  describe('getExpenses', () => {
    it('should return an array of expenses', async () => {
      const expenses = await getExpenses();

      // Basic check: should return an array
      expect(Array.isArray(expenses)).toBe(true);

      // Check based on the mock implementation
      expect(expenses.length).toBeGreaterThanOrEqual(1); // Expecting at least the sample expense
      expect(expenses[0]).toHaveProperty('id');
      expect(expenses[0]).toHaveProperty('description');
      expect(expenses[0]).toHaveProperty('amount');
      expect(expenses[0]).toHaveProperty('date');
      expect(expenses[0]).toHaveProperty('category');
      expect(expenses[0].date).toBeInstanceOf(Date);
      expect(typeof expenses[0].amount).toBe('number');
    });

    // Add more tests if the function had filtering or pagination logic
  });
});
