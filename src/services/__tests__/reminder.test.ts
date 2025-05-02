
import {
    getUpcomingReminders,
    saveUserReminders,
    addUserReminder,
    updateUserReminder,
    deleteUserReminder,
    type Reminder,
    REMINDER_STORAGE_KEY
} from '@/services/reminder';
import { parseISO, addHours, subHours } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'reminders') {
      const now = new Date();
      return Promise.resolve([
        { id: 'mock1', title: 'Mock Future Reminder', dateTime: addHours(now, 2).toISOString() },
        { id: 'mock2', title: 'Mock Past Reminder', dateTime: subHours(now, 2).toISOString() }, // Should be filtered out
        { id: 'mock3', title: 'Mock Future Reminder 2', dateTime: addHours(now, 5).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Reminder Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getUpcomingReminders', () => {
    it('should load and filter upcoming mock data when dataMode is "mock"', async () => {
      const reminders = await getUpcomingReminders('mock');
      expect(reminders.length).toBe(2); // mock2 should be filtered out
      expect(reminders[0].title).toBe('Mock Future Reminder');
      expect(reminders[1].title).toBe('Mock Future Reminder 2');
      expect(reminders[0].dateTime).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('reminders');
    });

    it('should load and filter upcoming user data from localStorage when dataMode is "user"', async () => {
       const now = new Date();
       const userReminders: Reminder[] = [
        { id: 'user1', title: 'User Future Reminder', dateTime: addHours(now, 1) },
        { id: 'user2', title: 'User Past Reminder', dateTime: subHours(now, 1) },
       ];
      saveUserReminders(userReminders);

      const reminders = await getUpcomingReminders('user');
      expect(reminders.length).toBe(1); // user2 should be filtered out
      expect(reminders[0].title).toBe('User Future Reminder');
      expect(reminders[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const reminders = await getUpcomingReminders('user');
        expect(reminders).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(REMINDER_STORAGE_KEY, '{"bad":');
        const reminders = await getUpcomingReminders('user');
        expect(reminders).toEqual([]);
     });

      it('should sort upcoming reminders by dateTime ascending', async () => {
           const now = new Date();
          const userReminders: Reminder[] = [
            { id: 'user1', title: 'Later', dateTime: addHours(now, 5) },
            { id: 'user2', title: 'Sooner', dateTime: addHours(now, 2) },
          ];
          saveUserReminders(userReminders);
          const reminders = await getUpcomingReminders('user');
          expect(reminders.length).toBe(2);
          expect(reminders[0].id).toBe('user2'); // Sooner first
          expect(reminders[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    // Need to mock window/localStorage for addUserReminder and others
    let originalLocalStorage: Storage;

    beforeAll(() => {
      // Mock localStorage only if it doesn't exist (like in Node test env)
      if (typeof window !== 'undefined') {
        originalLocalStorage = window.localStorage;
        // Spy on localStorage methods for user mode tests
        jest.spyOn(window.localStorage.__proto__, 'getItem');
        jest.spyOn(window.localStorage.__proto__, 'setItem');
        jest.spyOn(window.localStorage.__proto__, 'removeItem');
      } else {
        // Simple mock for Node environment
        global.window = {
             localStorage: {
                 getItem: jest.fn(),
                 setItem: jest.fn(),
                 removeItem: jest.fn(),
                 clear: jest.fn(),
                 length: 0,
                 key: jest.fn(),
             },
        } as any;
      }
    });

     afterAll(() => {
       // Restore original if it existed
       if (originalLocalStorage) {
         (window as any).localStorage = originalLocalStorage;
       } else {
          // Clean up mock
          delete (global as any).window;
       }
        jest.restoreAllMocks(); // Restore spies
     });

      beforeEach(() => {
        // Clear mock localStorage before each test in this block
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear();
            (window.localStorage.getItem as jest.Mock).mockClear();
            (window.localStorage.setItem as jest.Mock).mockClear();
        }
      });


    it('addUserReminder should add a reminder to localStorage', () => {
      const newReminderData = { title: 'New User Reminder', dateTime: addHours(new Date(), 3), description: 'Details' };
      // Mock getItem to return null initially
        (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(null);

      const addedReminder = addUserReminder(newReminderData);

      expect(addedReminder.id).toBeDefined();
      expect(addedReminder.title).toBe('New User Reminder');

      // Check that setItem was called correctly
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        REMINDER_STORAGE_KEY,
        JSON.stringify([{ ...newReminderData, id: addedReminder.id, dateTime: newReminderData.dateTime.toISOString() }])
      );
    });

    it('updateUserReminder should update an existing reminder in localStorage', () => {
       const initialReminder = { id: 'rem1', title: 'Initial', dateTime: addHours(new Date(), 4) };
       const initialStorage = JSON.stringify([{ ...initialReminder, dateTime: initialReminder.dateTime.toISOString() }]);
       (window.localStorage.getItem as jest.Mock).mockReturnValue(initialStorage);

       const updatedData: Reminder = { ...initialReminder, title: 'Updated Title' };
       const result = updateUserReminder(updatedData);

       expect(result).toBeDefined();
       expect(result?.title).toBe('Updated Title');

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
           REMINDER_STORAGE_KEY,
           JSON.stringify([{ ...updatedData, dateTime: updatedData.dateTime.toISOString() }])
       );
    });

     it('updateUserReminder should return undefined if reminder ID not found', () => {
        const initialReminder = { id: 'rem1', title: 'Initial', dateTime: addHours(new Date(), 4) };
        const initialStorage = JSON.stringify([{ ...initialReminder, dateTime: initialReminder.dateTime.toISOString() }]);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(initialStorage);

       const nonExistentUpdate: Reminder = { id: 'non-existent-id', title: 'Wont Update', dateTime: new Date() };
       const result = updateUserReminder(nonExistentUpdate);
       expect(result).toBeUndefined();
       expect(window.localStorage.setItem).not.toHaveBeenCalled(); // Should not save if not found
     });

     it('deleteUserReminder should remove a reminder from localStorage', () => {
         const reminder1 = { id: 'rem1', title: 'Rem 1', dateTime: addHours(new Date(), 1) };
         const reminder2 = { id: 'rem2', title: 'Rem 2', dateTime: addHours(new Date(), 2) };
         const initialStorage = JSON.stringify([
             { ...reminder1, dateTime: reminder1.dateTime.toISOString() },
             { ...reminder2, dateTime: reminder2.dateTime.toISOString() }
         ]);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(initialStorage);

        const success = deleteUserReminder(reminder1.id!);
        expect(success).toBe(true);

         expect(window.localStorage.setItem).toHaveBeenCalledWith(
           REMINDER_STORAGE_KEY,
           JSON.stringify([{ ...reminder2, dateTime: reminder2.dateTime.toISOString() }]) // Only rem2 should remain
       );
     });

      it('deleteUserReminder should return false if reminder ID not found', () => {
         const reminder1 = { id: 'rem1', title: 'Rem 1', dateTime: addHours(new Date(), 1) };
         const initialStorage = JSON.stringify([{ ...reminder1, dateTime: reminder1.dateTime.toISOString() }]);
         (window.localStorage.getItem as jest.Mock).mockReturnValue(initialStorage);

         const success = deleteUserReminder('non-existent-id');
         expect(success).toBe(false);
         expect(window.localStorage.setItem).not.toHaveBeenCalled(); // Should not save if not found
      });
  });
});
