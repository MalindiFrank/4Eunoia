import {
  getGoals,
  saveUserGoals,
  addUserGoal,
  updateUserGoal,
  deleteUserGoal,
  type Goal,
  GOALS_STORAGE_KEY
} from '@/services/goal';
import { parseISO } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'goals') {
      return Promise.resolve([
        { id: 'mock1', title: 'Mock Goal 1', status: 'In Progress', createdAt: new Date(2024, 5, 9).toISOString(), updatedAt: new Date(2024, 5, 10).toISOString() },
        { id: 'mock2', title: 'Mock Goal 2', status: 'Not Started', createdAt: new Date(2024, 5, 1).toISOString(), updatedAt: new Date(2024, 5, 1).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Goal Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getGoals', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const goals = await getGoals('mock');
      expect(goals.length).toBe(2);
      expect(goals[0].title).toBe('Mock Goal 1');
      expect(goals[0].createdAt).toBeInstanceOf(Date);
      expect(goals[0].updatedAt).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('goals');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userGoals: Goal[] = [
        { id: 'user1', title: 'User Goal 1', status: 'Achieved', createdAt: new Date(2024, 4, 1), updatedAt: new Date(2024, 5, 12) },
      ];
      saveUserGoals(userGoals); // Save to mock localStorage

      const goals = await getGoals('user');
      expect(goals.length).toBe(1);
      expect(goals[0].title).toBe('User Goal 1');
      expect(goals[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const goals = await getGoals('user');
        expect(goals).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(GOALS_STORAGE_KEY, '[[invalid');
        const goals = await getGoals('user');
        expect(goals).toEqual([]);
     });

      it('should sort goals by updatedAt descending', async () => {
          const userGoals: Goal[] = [
            { id: 'user1', title: 'Older Update', status: 'In Progress', createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 10) },
            { id: 'user2', title: 'Newer Update', status: 'In Progress', createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 12) },
          ];
          saveUserGoals(userGoals);
          const goals = await getGoals('user');
          expect(goals.length).toBe(2);
          expect(goals[0].id).toBe('user2'); // Newer update first
          expect(goals[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserGoal should add a goal to localStorage with createdAt/updatedAt', () => {
      const newGoalData = { title: 'New User Goal', status: 'Not Started' as const, description: 'Desc' };
      const addedGoal = addUserGoal(newGoalData);

      expect(addedGoal.id).toBeDefined();
      expect(addedGoal.title).toBe('New User Goal');
      expect(addedGoal.status).toBe('Not Started');
      expect(addedGoal.createdAt).toBeInstanceOf(Date);
      expect(addedGoal.updatedAt).toBeInstanceOf(Date);
      expect(addedGoal.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(addedGoal.updatedAt.getTime()).toEqual(addedGoal.createdAt.getTime());

      const storedGoals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '[]');
      expect(storedGoals.length).toBe(1);
      expect(storedGoals[0].title).toBe('New User Goal');
      expect(storedGoals[0].id).toBe(addedGoal.id);
    });

    it('updateUserGoal should update an existing goal and updatedAt timestamp', () => {
       const initialGoal = addUserGoal({ title: 'Initial Goal', status: 'Not Started' });
       const initialUpdatedAt = initialGoal.updatedAt;
       const updatedData = { id: initialGoal.id, status: 'In Progress' as const, title: 'Updated Goal Title' };

       // Introduce a slight delay to ensure updatedAt changes
        return new Promise<void>(resolve => setTimeout(resolve, 10)).then(() => {
           const result = updateUserGoal(updatedData);
           expect(result).toBeDefined();
           expect(result?.title).toBe('Updated Goal Title');
           expect(result?.status).toBe('In Progress');
           expect(result?.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime()); // Check if updatedAt is later

           const storedGoals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '[]');
           expect(storedGoals.length).toBe(1);
           expect(storedGoals[0].title).toBe('Updated Goal Title');
           expect(storedGoals[0].status).toBe('In Progress');
           expect(parseISO(storedGoals[0].updatedAt).getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
        });


    });

     it('updateUserGoal should return undefined if goal ID not found', () => {
       addUserGoal({ title: 'Existing Goal', status: 'Not Started' });
       const nonExistentUpdate = { id: 'non-existent-id', title: 'Wont Update' };
       const result = updateUserGoal(nonExistentUpdate);
       expect(result).toBeUndefined();
       const storedGoals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '[]');
       expect(storedGoals.length).toBe(1);
       expect(storedGoals[0].title).toBe('Existing Goal');
     });

     it('deleteUserGoal should remove a goal from localStorage', () => {
        const goal1 = addUserGoal({ title: 'Goal 1', status: 'Not Started' });
        const goal2 = addUserGoal({ title: 'Goal 2', status: 'Not Started' });

        const success = deleteUserGoal(goal1.id!);
        expect(success).toBe(true);

        const storedGoals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '[]');
        expect(storedGoals.length).toBe(1);
        expect(storedGoals[0].id).toBe(goal2.id);
     });

      it('deleteUserGoal should return false if goal ID not found', () => {
         addUserGoal({ title: 'Existing Goal', status: 'Not Started' });
         const success = deleteUserGoal('non-existent-id');
         expect(success).toBe(false);
          const storedGoals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || '[]');
         expect(storedGoals.length).toBe(1);
      });
  });
});
