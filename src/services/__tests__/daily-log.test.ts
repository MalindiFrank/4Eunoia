import {
  getDailyLogs,
  saveUserLogs,
  addUserLog,
  type LogEntry,
  DAILY_LOG_STORAGE_KEY
} from '@/services/daily-log';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'daily-logs') {
      return Promise.resolve([
        { id: 'mock1', date: new Date(2024, 5, 10).toISOString(), activity: 'Mock Activity 1' },
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
      expect(logs[0].date).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('daily-logs');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userLogs: LogEntry[] = [
        { id: 'user1', date: new Date(2024, 5, 12), activity: 'User Log 1', mood: '😌 Calm' },
      ];
      saveUserLogs(userLogs); // Save to mock localStorage

      const logs = await getDailyLogs('user');
      expect(logs.length).toBe(1);
      expect(logs[0].activity).toBe('User Log 1');
      expect(logs[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const logs = await getDailyLogs('user');
        expect(logs).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(DAILY_LOG_STORAGE_KEY, '}invalid json{');
        const logs = await getDailyLogs('user');
        expect(logs).toEqual([]);
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
    it('addUserLog should add a log entry to localStorage', () => {
      const newLogData = { date: new Date(), activity: 'New Log Activity', mood: '⚡ Productive' as const };
      const addedLog = addUserLog(newLogData);

      expect(addedLog.id).toBeDefined();
      expect(addedLog.activity).toBe('New Log Activity');
      expect(addedLog.mood).toBe('⚡ Productive');

      const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
      expect(storedLogs.length).toBe(1);
      expect(storedLogs[0].activity).toBe('New Log Activity');
      expect(storedLogs[0].id).toBe(addedLog.id);
    });

     it('addUserLog should prepend and sort entries', () => {
        const log1 = addUserLog({ date: new Date(2024, 5, 10), activity: 'Older' });
        const log2 = addUserLog({ date: new Date(2024, 5, 12), activity: 'Newer' });

        const storedLogs = JSON.parse(localStorage.getItem(DAILY_LOG_STORAGE_KEY) || '[]');
        expect(storedLogs.length).toBe(2);
        expect(storedLogs[0].id).toBe(log2.id); // Newer should be first after sort
        expect(storedLogs[1].id).toBe(log1.id);
     });
  });
});
