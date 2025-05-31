
'use client';

import { parseISO, isValid } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, push, child, remove } from 'firebase/database';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export const NOTES_STORAGE_KEY = 'prodev-notes';
const dateFields: (keyof Note)[] = ['createdAt', 'updatedAt'];

const firebaseDataToNotesArray = (data: any): Note[] => {
  if (!data) return [];
  return Object.entries(data)
    .map(([id, noteData]: [string, any]) => {
      const newItem: Partial<Note> = { id, ...(noteData as Omit<Note, 'id'>) };
      dateFields.forEach(field => {
        if (noteData[field]) {
          newItem[field] = parseISO(noteData[field] as string);
        }
      });
      return newItem as Note;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

const loadUserNotesFromLocalStorage = (): Note[] => {
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

const saveUserNotesToLocalStorage = (notes: Note[]) => {
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

export async function getNotes(): Promise<Note[]> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const notesRef = ref(db, `users/${currentUser.uid}/notes`);
      const snapshot = await get(notesRef);
      if (snapshot.exists()) {
        return firebaseDataToNotesArray(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error("Error fetching notes from Firebase:", error);
      throw error;
    }
  } else {
    return loadUserNotesFromLocalStorage();
  }
}

export const addUserNote = async (newNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    if (currentUser) {
        const notesRef = ref(db, `users/${currentUser.uid}/notes`);
        const newNoteRef = push(notesRef);
        const newNote: Note = {
            ...newNoteData,
            id: newNoteRef.key!,
            createdAt: now,
            updatedAt: now,
        };
        const dataToSave = {
            title: newNoteData.title,
            content: newNoteData.content,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(newNoteRef, dataToSave);
        return newNote;
    } else {
        const userNotes = loadUserNotesFromLocalStorage();
        const newLocalNote: Note = {
            ...newNoteData,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        };
        const updatedNotes = [newLocalNote, ...userNotes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        saveUserNotesToLocalStorage(updatedNotes);
        return newLocalNote;
    }
};

export const updateUserNote = async (updatedNoteData: Partial<Note> & { id: string }): Promise<Note | undefined> => {
    const currentUser = auth.currentUser;
    const now = new Date();
    let fullUpdatedNote: Note;

    if (currentUser) {
        const noteRef = ref(db, `users/${currentUser.uid}/notes/${updatedNoteData.id}`);
        const snapshot = await get(noteRef);
        if (!snapshot.exists()) return undefined;
        const existingNoteData = snapshot.val();
        fullUpdatedNote = {
            ...(existingNoteData as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>),
            id: updatedNoteData.id,
            createdAt: parseISO(existingNoteData.createdAt),
            ...updatedNoteData,
            updatedAt: now,
        };
        const dataToSave = {
            title: fullUpdatedNote.title,
            content: fullUpdatedNote.content,
            createdAt: fullUpdatedNote.createdAt.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(noteRef, dataToSave);
        return fullUpdatedNote;
    } else {
        const userNotes = loadUserNotesFromLocalStorage();
        let found = false;
        const updatedNotes = userNotes.map(note => {
            if (note.id === updatedNoteData.id) {
                found = true;
                fullUpdatedNote = { ...note, ...updatedNoteData, updatedAt: now };
                return fullUpdatedNote;
            }
            return note;
        }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        if (found) {
            saveUserNotesToLocalStorage(updatedNotes);
            return fullUpdatedNote!;
        }
        return undefined;
    }
};

export const deleteUserNote = async (noteId: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const noteRef = ref(db, `users/${currentUser.uid}/notes/${noteId}`);
        await remove(noteRef);
        return true;
    } else {
        const userNotes = loadUserNotesFromLocalStorage();
        const updatedNotes = userNotes.filter(note => note.id !== noteId);
        if (updatedNotes.length < userNotes.length) {
            saveUserNotesToLocalStorage(updatedNotes);
            return true;
        }
        return false;
    }
};

export { saveUserNotesToLocalStorage as saveUserNotes };
