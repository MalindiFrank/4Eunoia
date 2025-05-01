import {
    getTasks,
    saveUserTasks,
    addUserTask,
    updateUserTask,
    deleteUserTask,
    toggleUserTaskStatus,
    type Task,
    TASK_STORAGE_KEY
} from '@/services/task';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'tasks') {
      return Promise.resolve([
        { id: 'mock1', title: 'Mock Task 1', status: 'Pending', createdAt: new Date(2024, 5, 10).toISOString() },
        { id: 'mock2', title: 'Mock Task 2', status: 'Completed', dueDate: new Date(2024, 5, 9).toISOString(), createdAt: new Date(2024, 5, 8).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Task Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const tasks = await getTasks('mock');
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Mock Task 1');
      expect(tasks[0].createdAt).toBeInstanceOf(Date);
      expect(tasks[1].dueDate).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('tasks');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userTasks: Task[] = [
        { id: 'user1', title: 'User Task 1', status: 'In Progress', createdAt: new Date(2024, 5, 12) },
      ];
      saveUserTasks(userTasks);

      const tasks = await getTasks('user');
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('User Task 1');
      expect(tasks[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const tasks = await getTasks('user');
        expect(tasks).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(TASK_STORAGE_KEY, '{"a":');
        const tasks = await getTasks('user');
        expect(tasks).toEqual([]);
     });

     // Note: Sorting is done in the component, not the service for tasks
  });

  describe('User Data CRUD Operations', () => {
    it('addUserTask should add a task with createdAt', () => {
      const newTaskData = { title: 'New User Task', status: 'Pending' as const, description: 'Details' };
      const addedTask = addUserTask(newTaskData);

      expect(addedTask.id).toBeDefined();
      expect(addedTask.title).toBe('New User Task');
      expect(addedTask.status).toBe('Pending');
      expect(addedTask.createdAt).toBeInstanceOf(Date);

      const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
      expect(storedTasks.length).toBe(1);
      expect(storedTasks[0].title).toBe('New User Task');
      expect(storedTasks[0].id).toBe(addedTask.id);
       expect(storedTasks[0].createdAt).toBeDefined();
    });

    it('updateUserTask should update an existing task', () => {
       const initialTask = addUserTask({ title: 'Initial Task', status: 'Pending' });
       const updatedData: Task = { ...initialTask, status: 'In Progress', title: 'Updated Task Title' };

       const result = updateUserTask(updatedData);
       expect(result).toBeDefined();
       expect(result?.title).toBe('Updated Task Title');
       expect(result?.status).toBe('In Progress');
       expect(result?.createdAt?.getTime()).toEqual(initialTask.createdAt?.getTime()); // createdAt should persist

        const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
        expect(storedTasks.length).toBe(1);
        expect(storedTasks[0].title).toBe('Updated Task Title');
        expect(storedTasks[0].status).toBe('In Progress');
        expect(storedTasks[0].id).toBe(initialTask.id);
    });

     it('updateUserTask should return undefined if task ID not found', () => {
       addUserTask({ title: 'Existing Task', status: 'Pending' });
       const nonExistentUpdate: Task = { id: 'non-existent-id', title: 'Wont Update', status: 'Pending' };
       const result = updateUserTask(nonExistentUpdate);
       expect(result).toBeUndefined();
       const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
       expect(storedTasks.length).toBe(1);
       expect(storedTasks[0].title).toBe('Existing Task');
     });

     it('deleteUserTask should remove a task from localStorage', () => {
        const task1 = addUserTask({ title: 'Task 1', status: 'Pending' });
        const task2 = addUserTask({ title: 'Task 2', status: 'Pending' });

        const success = deleteUserTask(task1.id!);
        expect(success).toBe(true);

        const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
        expect(storedTasks.length).toBe(1);
        expect(storedTasks[0].id).toBe(task2.id);
     });

      it('deleteUserTask should return false if task ID not found', () => {
         addUserTask({ title: 'Existing Task', status: 'Pending' });
         const success = deleteUserTask('non-existent-id');
         expect(success).toBe(false);
          const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
         expect(storedTasks.length).toBe(1);
      });

      it('toggleUserTaskStatus should toggle between Pending and Completed', () => {
         const task = addUserTask({ title: 'Toggle Task', status: 'Pending' });

         let updatedTask = toggleUserTaskStatus(task.id);
         expect(updatedTask?.status).toBe('Completed');
          let storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
         expect(storedTasks[0].status).toBe('Completed');

         updatedTask = toggleUserTaskStatus(task.id);
         expect(updatedTask?.status).toBe('Pending');
         storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
         expect(storedTasks[0].status).toBe('Pending');
      });

       it('toggleUserTaskStatus should toggle In Progress to Completed', () => {
         const task = addUserTask({ title: 'Toggle Task', status: 'In Progress' });

         const updatedTask = toggleUserTaskStatus(task.id);
         expect(updatedTask?.status).toBe('Completed');
          const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
         expect(storedTasks[0].status).toBe('Completed');
       });


      it('toggleUserTaskStatus should return undefined if task ID not found', () => {
          addUserTask({ title: 'Existing Task', status: 'Pending' });
          const result = toggleUserTaskStatus('non-existent-id');
          expect(result).toBeUndefined();
           const storedTasks = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '[]');
          expect(storedTasks.length).toBe(1); // Should not change
      });
  });
});
