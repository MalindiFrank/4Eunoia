
'use client';

import { parseISO } from 'date-fns';
// loadMockData is no longer needed
// import { loadMockData } from '@/lib/data-loader';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export const NOTES_STORAGE_KEY = 'prodev-notes';
const dateFields: (keyof Note)[] = ['createdAt', 'updatedAt'];

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

// dataMode parameter is now ignored, always loads from user storage
export async function getNotes(dataMode?: 'mock' | 'user'): Promise<Note[]> {
  return loadUserNotes();
}

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

export const deleteUserNote = (noteId: string): boolean => {
    const userNotes = loadUserNotes();
    const updatedNotes = userNotes.filter(note => note.id !== noteId);
    if (updatedNotes.length < userNotes.length) {
        saveUserNotes(updatedNotes);
        return true;
    }
    return false;
}
