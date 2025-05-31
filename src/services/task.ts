
'use client';

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader';

export const TASK_STORAGE_KEY = 'prodev-tasks';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: Date; 
}

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

// dataMode parameter is now ignored, always loads from user storage
export async function getTasks(dataMode?: 'mock' | 'user'): Promise<Task[]> {
  return loadUserTasks();
}

export const addUserTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>): Task => {
    const userTasks = loadUserTasks();
    const newTask: Task = {
        ...newTaskData,
        id: crypto.randomUUID(),
        createdAt: new Date(), 
    };
    const updatedTasks = [newTask, ...userTasks]; 
    saveUserTasks(updatedTasks);
    return newTask;
}

export const updateUserTask = (updatedTask: Task): Task | undefined => {
    if (!updatedTask.id) return undefined;
    const userTasks = loadUserTasks();
    let found = false;
    const updatedTasks = userTasks.map(task => {
        if (task.id === updatedTask.id) {
            found = true;
            return { ...task, ...updatedTask }; 
        }
        return task;
    });

    if (found) {
        saveUserTasks(updatedTasks);
        return updatedTask; 
    }
    return undefined;
}

export const deleteUserTask = (taskId: string): boolean => {
    const userTasks = loadUserTasks();
    const updatedTasks = userTasks.filter(task => task.id !== taskId);
    if (updatedTasks.length < userTasks.length) {
        saveUserTasks(updatedTasks);
        return true;
    }
    return false;
}

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
