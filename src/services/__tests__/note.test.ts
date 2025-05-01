import {
  getNotes,
  saveUserNotes,
  addUserNote,
  updateUserNote,
  deleteUserNote,
  type Note,
  NOTES_STORAGE_KEY
} from '@/services/note';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'notes') {
      return Promise.resolve([
        { id: 'mock1', title: 'Mock Note 1', content: 'Content 1', createdAt: new Date(2024, 5, 9).toISOString(), updatedAt: new Date(2024, 5, 10).toISOString() },
        { id: 'mock2', title: 'Mock Note 2', content: 'Content 2', createdAt: new Date(2024, 5, 1).toISOString(), updatedAt: new Date(2024, 5, 1).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Note Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getNotes', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const notes = await getNotes('mock');
      expect(notes.length).toBe(2);
      expect(notes[0].title).toBe('Mock Note 1');
      expect(notes[0].createdAt).toBeInstanceOf(Date);
      expect(notes[0].updatedAt).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('notes');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userNotes: Note[] = [
        { id: 'user1', title: 'User Note 1', content: 'User Content', createdAt: new Date(2024, 4, 1), updatedAt: new Date(2024, 5, 12) },
      ];
      saveUserNotes(userNotes);

      const notes = await getNotes('user');
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('User Note 1');
      expect(notes[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const notes = await getNotes('user');
        expect(notes).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(NOTES_STORAGE_KEY, 'invalid}}');
        const notes = await getNotes('user');
        expect(notes).toEqual([]);
     });

      it('should sort notes by updatedAt descending', async () => {
          const userNotes: Note[] = [
            { id: 'user1', title: 'Older Update', content: '', createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 10) },
            { id: 'user2', title: 'Newer Update', content: '', createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 12) },
          ];
          saveUserNotes(userNotes);
          const notes = await getNotes('user');
          expect(notes.length).toBe(2);
          expect(notes[0].id).toBe('user2');
          expect(notes[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserNote should add a note with createdAt/updatedAt', () => {
      const newNoteData = { title: 'New Note Title', content: 'Note Content' };
      const addedNote = addUserNote(newNoteData);

      expect(addedNote.id).toBeDefined();
      expect(addedNote.title).toBe('New Note Title');
      expect(addedNote.content).toBe('Note Content');
      expect(addedNote.createdAt).toBeInstanceOf(Date);
      expect(addedNote.updatedAt).toBeInstanceOf(Date);
      expect(addedNote.createdAt.getTime()).toEqual(addedNote.updatedAt.getTime());

      const storedNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
      expect(storedNotes.length).toBe(1);
      expect(storedNotes[0].title).toBe('New Note Title');
      expect(storedNotes[0].id).toBe(addedNote.id);
    });

    it('updateUserNote should update an existing note and updatedAt timestamp', () => {
       const initialNote = addUserNote({ title: 'Initial Note', content: 'Initial Content' });
       const initialUpdatedAt = initialNote.updatedAt;
       const updatedData = { id: initialNote.id, content: 'Updated Content' };

       return new Promise<void>(resolve => setTimeout(resolve, 10)).then(() => {
           const result = updateUserNote(updatedData);
           expect(result).toBeDefined();
           expect(result?.content).toBe('Updated Content');
           expect(result?.title).toBe('Initial Note'); // Title should remain
           expect(result?.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());

           const storedNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
           expect(storedNotes.length).toBe(1);
           expect(storedNotes[0].content).toBe('Updated Content');
           expect(parseISO(storedNotes[0].updatedAt).getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
       });
    });

     it('updateUserNote should return undefined if note ID not found', () => {
       addUserNote({ title: 'Existing Note', content: 'Content' });
       const nonExistentUpdate = { id: 'non-existent-id', title: 'Wont Update' };
       const result = updateUserNote(nonExistentUpdate);
       expect(result).toBeUndefined();
       const storedNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
       expect(storedNotes.length).toBe(1);
       expect(storedNotes[0].title).toBe('Existing Note');
     });

     it('deleteUserNote should remove a note from localStorage', () => {
        const note1 = addUserNote({ title: 'Note 1', content: '' });
        const note2 = addUserNote({ title: 'Note 2', content: '' });

        const success = deleteUserNote(note1.id!);
        expect(success).toBe(true);

        const storedNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
        expect(storedNotes.length).toBe(1);
        expect(storedNotes[0].id).toBe(note2.id);
     });

      it('deleteUserNote should return false if note ID not found', () => {
         addUserNote({ title: 'Existing Note', content: '' });
         const success = deleteUserNote('non-existent-id');
         expect(success).toBe(false);
          const storedNotes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]');
         expect(storedNotes.length).toBe(1);
      });
  });
});
