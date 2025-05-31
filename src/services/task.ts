
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

export const TASK_STORAGE_KEY = 'prodev-tasks';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: Date;
}

// Helper to convert Firebase object to array and parse dates
const firebaseDataToTasksArray = (data: any): Task[] => {
  if (!data) return [];
  return Object.entries(data).map(([id, taskData]: [string, any]) => ({
    id,
    ...(taskData as Omit<Task, 'id'>),
    dueDate: taskData.dueDate ? parseISO(taskData.dueDate) : undefined,
    createdAt: taskData.createdAt ? parseISO(taskData.createdAt) : undefined,
  }));
};

const loadUserTasksFromLocalStorage = (): Task[] => {
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

const saveUserTasksToLocalStorage = (tasks: Task[]) => {
   if (typeof window === 'undefined') return;
  try {
    const tasksToStore = tasks.map(task => ({
      ...task,
      dueDate: task.dueDate?.toISOString(),
      createdAt: task.createdAt?.toISOString(),
    }));
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasksToStore));
  } catch (e) {
    console.error("Error saving tasks to localStorage:", e);
  }
};

export async function getTasks(): Promise<Task[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const tasksRef = ref(db, `users/${currentUser.uid}/tasks`);
      const snapshot = await get(tasksRef);
      if (snapshot.exists()) {
        return firebaseDataToTasksArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching tasks from Firebase:", error);
      throw error; // Re-throw to be handled by caller
    }
  } else {
    return loadUserTasksFromLocalStorage();
  }
}

export const addUserTask = async (newTaskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    const taskWithTimestamp = { ...newTaskData, createdAt: now.toISOString() };

    if (currentUser) {
        const tasksRef = ref(db, `users/${currentUser.uid}/tasks`);
        const newTaskRef = push(tasksRef); // Generates a unique ID
        const newTask: Task = {
            ...newTaskData,
            id: newTaskRef.key!,
            createdAt: now,
        };
        const dataToSave = {
            ...newTaskData,
            createdAt: now.toISOString(),
            dueDate: newTaskData.dueDate?.toISOString(),
        };
        await set(newTaskRef, dataToSave);
        return newTask;
    } else {
        const userTasks = loadUserTasksFromLocalStorage();
        const newLocalTask: Task = {
            ...newTaskData,
            id: crypto.randomUUID(),
            createdAt: now,
        };
        const updatedTasks = [newLocalTask, ...userTasks];
        saveUserTasksToLocalStorage(updatedTasks);
        return newLocalTask;
    }
};

export const updateUserTask = async (updatedTaskData: Task): Promise<Task | undefined> => {
    if (!updatedTaskData.id) return undefined;
    const currentUser = auth.currentUser;

    const dataToSave = {
      ...updatedTaskData,
      id: undefined, // Don't save id as a property in Firebase object
      createdAt: updatedTaskData.createdAt?.toISOString(),
      dueDate: updatedTaskData.dueDate?.toISOString(),
    };
    delete dataToSave.id;


    if (currentUser) {
        const taskRef = ref(db, `users/${currentUser.uid}/tasks/${updatedTaskData.id}`);
        await set(taskRef, dataToSave);
        return updatedTaskData;
    } else {
        const userTasks = loadUserTasksFromLocalStorage();
        let found = false;
        const updatedTasks = userTasks.map(task => {
            if (task.id === updatedTaskData.id) {
                found = true;
                return { ...task, ...updatedTaskData };
            }
            return task;
        });
        if (found) {
            saveUserTasksToLocalStorage(updatedTasks);
            return updatedTaskData;
        }
        return undefined;
    }
};

export const deleteUserTask = async (taskId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const taskRef = ref(db, `users/${currentUser.uid}/tasks/${taskId}`);
        await remove(taskRef);
        return true; // Assume success if no error
    } else {
        const userTasks = loadUserTasksFromLocalStorage();
        const updatedTasks = userTasks.filter(task => task.id !== taskId);
        if (updatedTasks.length < userTasks.length) {
            saveUserTasksToLocalStorage(updatedTasks);
            return true;
        }
        return false;
    }
};

export const toggleUserTaskStatus = async (taskId: string): Promise<Task | undefined> => {
    const currentUser = auth.currentUser;
    let tasksArray: Task[];
    let taskToUpdate: Task | undefined;

    if (currentUser) {
        const tasksRef = ref(db, `users/${currentUser.uid}/tasks`);
        const snapshot = await get(tasksRef);
        tasksArray = firebaseDataToTasksArray(snapshot.val());
        taskToUpdate = tasksArray.find(task => task.id === taskId);

        if (taskToUpdate) {
            const newStatus = taskToUpdate.status === 'Completed' ? 'Pending' : 'Completed';
            const updatedTask = { ...taskToUpdate, status: newStatus };
            const taskSpecificRef = ref(db, `users/${currentUser.uid}/tasks/${taskId}`);
            const dataToSave = {
                 ...updatedTask,
                 id: undefined,
                 createdAt: updatedTask.createdAt?.toISOString(),
                 dueDate: updatedTask.dueDate?.toISOString(),
            };
            delete dataToSave.id;
            await set(taskSpecificRef, dataToSave);
            return updatedTask;
        }
    } else {
        tasksArray = loadUserTasksFromLocalStorage();
        taskToUpdate = tasksArray.find(task => task.id === taskId);
        if (taskToUpdate) {
            const newStatus = taskToUpdate.status === 'Completed' ? 'Pending' : 'Completed';
            const updatedTask = { ...taskToUpdate, status: newStatus };
            const updatedTasksList = tasksArray.map(t => t.id === taskId ? updatedTask : t);
            saveUserTasksToLocalStorage(updatedTasksList);
            return updatedTask;
        }
    }
    return undefined;
};

// Keep saveUserTasks if it's used by other logic, e.g. settings reset,
// but generally direct modifications will happen via add/update/delete.
export { saveUserTasksToLocalStorage as saveUserTasks };
