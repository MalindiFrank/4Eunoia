'use client';

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

// Local storage key
export const TASK_STORAGE_KEY = 'prodev-tasks';

/**
 * Represents a task.
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: Date; // Added createdAt
}

// Function to load tasks from localStorage
const loadUserTasks = (): Task[] => {
  if (typeof window === 'undefined') return [];
  const storedTasks = localStorage.getItem(TASK_STORAGE_KEY);
  if (storedTasks) {
    try {
      return JSON.parse(storedTasks).map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
        createdAt: task.createdAt ? parseISO(task.createdAt) : undefined,
      }));
    } catch (e) {
      console.error("Error parsing tasks from localStorage:", e);
      return [];
    }
  }
  return [];
};

// Function to save tasks to localStorage
export const saveUserTasks = (tasks: Task[]) => {
   if (typeof window === 'undefined') return;
  try {
    const tasksToStore = tasks.map(task => ({
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
      createdAt: task.createdAt ? task.createdAt.toISOString() : undefined,
    }));
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasksToStore));
  } catch (e) {
    console.error("Error saving tasks to localStorage:", e);
  }
};


// Function to fetch tasks based on data mode
export async function getTasks(dataMode: 'mock' | 'user'): Promise<Task[]> {
  if (dataMode === 'user') {
    return loadUserTasks();
  } else {
    const mockTasksRaw = await loadMockData<any>('tasks');
    return mockTasksRaw.map(task => ({
        ...task,
        dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
        createdAt: task.createdAt ? parseISO(task.createdAt) : undefined, // Parse createdAt if present
    }));
  }
}

// Function to add a new user task
export const addUserTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>): Task => {
    const userTasks = loadUserTasks();
    const newTask: Task = {
        ...newTaskData,
        id: crypto.randomUUID(),
        createdAt: new Date(), // Set creation date
    };
    const updatedTasks = [newTask, ...userTasks]; // Prepend new task
    saveUserTasks(updatedTasks);
    return newTask;
}

// Function to update a user task
export const updateUserTask = (updatedTask: Task): Task | undefined => {
    if (!updatedTask.id) return undefined;
    const userTasks = loadUserTasks();
    let found = false;
    const updatedTasks = userTasks.map(task => {
        if (task.id === updatedTask.id) {
            found = true;
            return { ...task, ...updatedTask }; // Merge updates, keep original createdAt if not provided
        }
        return task;
    });

    if (found) {
        saveUserTasks(updatedTasks);
        return updatedTask; // Return the merged task data
    }
    return undefined;
}

// Function to delete a user task
export const deleteUserTask = (taskId: string): boolean => {
    const userTasks = loadUserTasks();
    const updatedTasks = userTasks.filter(task => task.id !== taskId);
    if (updatedTasks.length < userTasks.length) {
        saveUserTasks(updatedTasks);
        return true;
    }
    return false;
}

// Function to toggle task status
export const toggleUserTaskStatus = (taskId: string): Task | undefined => {
    const userTasks = loadUserTasks();
    let updatedTask: Task | undefined;
    const updatedTasks = userTasks.map((task) => {
        if (task.id === taskId) {
            const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
            updatedTask = { ...task, status: newStatus };
             return updatedTask;
        }
        return task;
     });

     if (updatedTask) {
         saveUserTasks(updatedTasks);
     }
     return updatedTask;
}