'use client';

import { parseISO } from 'date-fns';
import { loadMockData } from '@/lib/data-loader';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Local storage key
export const NOTES_STORAGE_KEY = 'prodev-notes';
const dateFields: (keyof Note)[] = ['createdAt', 'updatedAt'];

// Function to load notes from localStorage
const loadUserNotes = (): Note[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(NOTES_STORAGE_KEY);
  if (storedData) {
    try {
      const parsedData = JSON.parse(storedData).map((item: any) => {
        const newItem: Partial<Note> = { ...item };
        dateFields.forEach(field => {
          if (newItem[field]) {
            newItem[field] = parseISO(newItem[field] as string);
          }
        });
        return newItem as Note;
      });
      return parsedData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (e) {
      console.error(`Error parsing ${NOTES_STORAGE_KEY} from localStorage:`, e);
      return [];
    }
  }
  return [];
};

// Function to save notes to localStorage
export const saveUserNotes = (notes: Note[]) => {
  if (typeof window === 'undefined') return;
  try {
    const dataToStore = notes.map(item => {
      const newItem: any = { ...item };
      dateFields.forEach(field => {
        const dateValue = newItem[field] as Date | undefined;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          newItem[field] = dateValue.toISOString();
        }
      });
      return newItem;
    });
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (e) {
    console.error(`Error saving ${NOTES_STORAGE_KEY} to localStorage:`, e);
  }
};

// Function to fetch notes based on data mode
export async function getNotes(dataMode: 'mock' | 'user'): Promise<Note[]> {
  if (dataMode === 'user') {
    return loadUserNotes();
  } else {
    const mockDataRaw = await loadMockData<any>('notes');
    return mockDataRaw.map(note => ({
      ...note,
      createdAt: parseISO(note.createdAt),
      updatedAt: parseISO(note.updatedAt),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

// Function to add a new user note
export const addUserNote = (newNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
    const userNotes = loadUserNotes();
    const now = new Date();
    const newNote: Note = {
        ...newNoteData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
    };
    const updatedNotes = [newNote, ...userNotes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    saveUserNotes(updatedNotes);
    return newNote;
}

// Function to update a user note
export const updateUserNote = (updatedNoteData: Partial<Note> & { id: string }): Note | undefined => {
    const userNotes = loadUserNotes();
    let updatedNote: Note | undefined = undefined;
    const now = new Date();
    const updatedNotes = userNotes.map(note => {
        if (note.id === updatedNoteData.id) {
            updatedNote = { ...note, ...updatedNoteData, updatedAt: now };
            return updatedNote;
        }
        return note;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (updatedNote) {
        saveUserNotes(updatedNotes);
    }
    return updatedNote;
}

// Function to delete a user note
export const deleteUserNote = (noteId: string): boolean => {
    const userNotes = loadUserNotes();
    const updatedNotes = userNotes.filter(note => note.id !== noteId);
    if (updatedNotes.length < userNotes.length) {
        saveUserNotes(updatedNotes);
        return true;
    }
    return false;
}