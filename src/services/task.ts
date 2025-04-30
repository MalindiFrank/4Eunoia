/**
 * Represents a task.
 */
export interface Task {
  /**
   * The unique identifier of the task.
   */
  id: string;
  /**
   * The title of the task.
   */
  title: string;
  /**
   * A description of the task.
   */
  description?: string;
  /**
   * The due date of the task.
   */
  dueDate?: Date;
  /**
   * The status of the task (e.g., 'Pending', 'In Progress', 'Completed').
   */
  status: 'Pending' | 'In Progress' | 'Completed';
}

/**
 * Asynchronously retrieves a list of tasks.
 *
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getTasks(): Promise<Task[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      title: 'Grocery Shopping',
      description: 'Buy groceries for the week',
      dueDate: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'Pending'
    }
  ];
}
