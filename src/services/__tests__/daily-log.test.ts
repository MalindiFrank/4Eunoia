
import {
  getDailyLogs,
  saveUserLogs,
  addUserLog,
  updateUserLog, // Import updateUserLog
  deleteUserLog, // Import deleteUserLog
  type LogEntry,
  DAILY_LOG_STORAGE_KEY
} from '@/services/daily-log';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'daily-logs') {
      return Promise.resolve([
        { id: 'mock1', date: new Date(2024, 5, 10).toISOString(), activity: 'Mock Activity 1', focusLevel: 4 },
        { id: 'mock2', date: new Date(2024, 5, 9).toISOString(), activity: 'Mock Activity 2', mood: '😊 Happy' },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Daily Log Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getDailyLogs', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const logs = await getDailyLogs('mock');
      expect(logs.length).toBe(2);
      expect(logs[0].activity).toBe('Mock Activity 1');
      expect(logs[0].focusLevel).toBe(4); // Check focus level from mock
      expect(logs[1].focusLevel).toBeUndefined();
      expect(logs[0].date).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('daily-logs');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userLogs: LogEntry[] = [
        { id: 'user1', date: new Date(2024, 5, 12), activity: 'User Log 1', mood: '😌 Calm', focusLevel: 5 },
      ];
      saveUserLogs(userLogs); // Save to mock localStorage

      const logs = await getDailyLogs('user');
      expect(logs.length).toBe(1);
      expect(logs[0].activity).toBe('User Log 1');
      expect(logs[0].id).toBe('user1');
      expect(logs[0].focusLevel).toBe(5);
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const logs = await getDailyLogs('user');
        expect(logs).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON and clear it', async () => {
        localStorage.setItem(DAILY_LOG_STORAGE_KEY, '}invalid json{');
        const logs = await getDailyLogs('user');
        expect(logs).toEqual([]);
        expect(localStorage.getItem(DAILY_LOG_STORAGE_KEY)).toBeNull(); // Should be cleared
     });

      it('should sort logs by date descending', async () => {
          const userLogs: LogEntry[] = [
            { id: 'user1', date: new Date(2024, 5, 10), activity: 'Older' },
            { id: 'user2', date: new Date(2024, 5, 12), activity: 'Newer' },
          ];
          saveUserLogs(userLogs);
          const logs = await getDailyLogs('user');
          expect(logs.length).toBe(2);
          expect(logs[0].id).toBe('user2'); // Newer first
          expect(logs[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserLog should add a log entry with focusLevel to localStorage', () => {
      const newLogData = { date: new Date(), activity: 'Focused Work', focusLevel: 5, mood: '⚡ Productive' as const };
      const addedLog = addUserLog(newLogData);

      expect(addedLog.id).toBeDefined();
      expect(addedLog.activity).toBe('Focused Work');
      expect(addedLog.mood).toBe('⚡ Productive');
      expect(addedLog.focusLevel).toBe(5);

      const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
      expect(storedLogs.length).toBe(1);
      expect(storedLogs[0].activity).toBe('Focused Work');
      expect(storedLogs[0].id).toBe(addedLog.id);
      expect(storedLogs[0].focusLevel).toBe(5);
    });

     it('addUserLog should add a log entry without optional fields', () => {
        const newLogData = { date: new Date(), activity: 'Simple Log' };
        const addedLog = addUserLog(newLogData);
        expect(addedLog.id).toBeDefined();
        expect(addedLog.activity).toBe('Simple Log');
        expect(addedLog.mood).toBeUndefined();
        expect(addedLog.focusLevel).toBeUndefined();
        expect(addedLog.notes).toBeUndefined();
        expect(addedLog.diaryEntry).toBeUndefined();

         const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
         expect(storedLogs.length).toBe(1);
         expect(storedLogs[0].activity).toBe('Simple Log');
         expect(storedLogs[0].mood).toBeUndefined();
         expect(storedLogs[0].focusLevel).toBeUndefined();
     });

     it('addUserLog should ignore invalid focusLevel', () => {
        const newLogData = { date: new Date(), activity: 'Invalid Focus', focusLevel: 0 }; // Invalid level
        const addedLog = addUserLog(newLogData);
        expect(addedLog.focusLevel).toBeUndefined();

        const newLogData2 = { date: new Date(), activity: 'Invalid Focus 2', focusLevel: 6 }; // Invalid level
        const addedLog2 = addUserLog(newLogData2);
        expect(addedLog2.focusLevel).toBeUndefined();

         const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
         expect(storedLogs.length).toBe(2);
         expect(storedLogs[0].focusLevel).toBeUndefined();
         expect(storedLogs[1].focusLevel).toBeUndefined();
     });


     it('addUserLog should prepend and sort entries', () => {
        const log1 = addUserLog({ date: new Date(2024, 5, 10), activity: 'Older' });
        const log2 = addUserLog({ date: new Date(2024, 5, 12), activity: 'Newer' });

        const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
        expect(storedLogs.length).toBe(2);
        expect(storedLogs[0].id).toBe(log2.id); // Newer should be first after sort
        expect(storedLogs[1].id).toBe(log1.id);
     });

     // Test Update and Delete
     it('updateUserLog should update an existing log entry', () => {
         const initialLog = addUserLog({ date: new Date(), activity: 'Initial Activity', focusLevel: 3 });
         const updatedData: LogEntry = { ...initialLog, activity: 'Updated Activity', focusLevel: 5 };

         const result = updateUserLog(updatedData);
         expect(result).toBeDefined();
         expect(result?.activity).toBe('Updated Activity');
         expect(result?.focusLevel).toBe(5);

         const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
         expect(storedLogs.length).toBe(1);
         expect(storedLogs[0].activity).toBe('Updated Activity');
         expect(storedLogs[0].focusLevel).toBe(5);
     });

     it('updateUserLog should handle invalid focusLevel on update', () => {
          const initialLog = addUserLog({ date: new Date(), activity: 'Initial Activity', focusLevel: 3 });
          const updatedData: LogEntry = { ...initialLog, activity: 'Updated Activity', focusLevel: 0 }; // Invalid

          const result = updateUserLog(updatedData);
          expect(result).toBeDefined();
          expect(result?.focusLevel).toBeUndefined(); // Should become undefined

          const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
          expect(storedLogs[0].focusLevel).toBeUndefined();
     });

      it('updateUserLog should return undefined if log ID not found', () => {
          addUserLog({ date: new Date(), activity: 'Existing' });
          const nonExistentUpdate: LogEntry = { id: 'non-existent', date: new Date(), activity: 'Wont Update' };
          const result = updateUserLog(nonExistentUpdate);
          expect(result).toBeUndefined();
          const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
          expect(storedLogs.length).toBe(1); // Should remain 1
      });

      it('deleteUserLog should remove a log entry', () => {
          const log1 = addUserLog({ date: new Date(), activity: 'Log 1' });
          const log2 = addUserLog({ date: new Date(), activity: 'Log 2' });
          const success = deleteUserLog(log1.id);
          expect(success).toBe(true);
          const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
          expect(storedLogs.length).toBe(1);
          expect(storedLogs[0].id).toBe(log2.id);
      });

      it('deleteUserLog should return false if log ID not found', () => {
          addUserLog({ date: new Date(), activity: 'Log 1' });
          const success = deleteUserLog('non-existent-id');
          expect(success).toBe(false);
          const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
          expect(storedLogs.length).toBe(1);
      });
  });
});
