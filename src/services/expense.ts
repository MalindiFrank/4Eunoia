/**
 * Represents an expense.
 */
export interface Expense {
  /**
   * The unique identifier of the expense.
   */
  id: string;
  /**
   * A description of the expense.
   */
  description: string;
  /**
   * The amount of the expense.
   */
  amount: number;
  /**
   * The date of the expense.
   */
  date: Date;
  /**
   * The category of the expense (e.g., 'Food', 'Transportation', 'Entertainment').
   */
  category: string;
}

/**
 * Asynchronously retrieves a list of expenses.
 *
 * @returns A promise that resolves to an array of Expense objects.
 */
export async function getExpenses(): Promise<Expense[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      description: 'Lunch with colleagues',
      amount: 25.50,
      date: new Date(),
      category: 'Food'
    }
  ];
}
