import { getTasks, Task } from '@/services/task'; // Adjust path as necessary

describe('Task Service', () => {
  describe('getTasks', () => {
    it('should return an array of tasks', async () => {
      const tasks = await getTasks();

      // Basic check: should return an array
      expect(Array.isArray(tasks)).toBe(true);

      // Check based on the mock implementation
      expect(tasks.length).toBeGreaterThanOrEqual(1); // Expecting at least the sample task
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('title');
      expect(tasks[0]).toHaveProperty('status');
      // dueDate and description are optional
       expect(tasks[0].dueDate).toBeInstanceOf(Date); // In the mock, the first task has a dueDate
       expect(['Pending', 'In Progress', 'Completed']).toContain(tasks[0].status);
    });

    // Add more tests if the function had filtering or sorting logic
  });
});
