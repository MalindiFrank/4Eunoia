import {
  getHabits,
  saveUserHabits,
  addUserHabit,
  updateUserHabit,
  deleteUserHabit,
  markUserHabitComplete,
  type Habit,
  HABITS_STORAGE_KEY
} from '@/services/habit';
import { parseISO, startOfDay } from 'date-fns';

// Mock loadMockData
jest.mock('@/lib/data-loader', () => ({
  loadMockData: jest.fn(async (fileName) => {
    if (fileName === 'habits') {
      return Promise.resolve([
        { id: 'mock1', title: 'Mock Meditate', frequency: 'Daily', streak: 5, createdAt: new Date(2024, 5, 1).toISOString(), updatedAt: new Date(2024, 5, 10).toISOString(), lastCompleted: new Date(2024, 5, 9).toISOString() },
        { id: 'mock2', title: 'Mock Exercise', frequency: 'Weekly', streak: 2, createdAt: new Date(2024, 4, 1).toISOString(), updatedAt: new Date(2024, 5, 8).toISOString(), lastCompleted: new Date(2024, 5, 7).toISOString() },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Habit Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getHabits', () => {
    it('should load mock data when dataMode is "mock"', async () => {
      const habits = await getHabits('mock');
      expect(habits.length).toBe(2);
      expect(habits[0].title).toBe('Mock Meditate');
      expect(habits[0].createdAt).toBeInstanceOf(Date);
      expect(habits[0].lastCompleted).toBeInstanceOf(Date);
      expect(require('@/lib/data-loader').loadMockData).toHaveBeenCalledWith('habits');
    });

    it('should load user data from localStorage when dataMode is "user"', async () => {
      const userHabits: Habit[] = [
        { id: 'user1', title: 'User Drink Water', frequency: 'Daily', streak: 10, createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 12), lastCompleted: new Date(2024, 5, 11) },
      ];
      saveUserHabits(userHabits);

      const habits = await getHabits('user');
      expect(habits.length).toBe(1);
      expect(habits[0].title).toBe('User Drink Water');
      expect(habits[0].id).toBe('user1');
      expect(require('@/lib/data-loader').loadMockData).not.toHaveBeenCalled();
    });

     it('should return empty array if localStorage is empty in "user" mode', async () => {
        const habits = await getHabits('user');
        expect(habits).toEqual([]);
     });

     it('should return empty array if localStorage contains invalid JSON', async () => {
        localStorage.setItem(HABITS_STORAGE_KEY, '{invalid');
        const habits = await getHabits('user');
        expect(habits).toEqual([]);
     });

      it('should sort habits by updatedAt descending', async () => {
          const userHabits: Habit[] = [
            { id: 'user1', title: 'Older Update', frequency: 'Daily', streak: 1, createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 10) },
            { id: 'user2', title: 'Newer Update', frequency: 'Daily', streak: 1, createdAt: new Date(2024, 5, 1), updatedAt: new Date(2024, 5, 12) },
          ];
          saveUserHabits(userHabits);
          const habits = await getHabits('user');
          expect(habits.length).toBe(2);
          expect(habits[0].id).toBe('user2');
          expect(habits[1].id).toBe('user1');
      });
  });

  describe('User Data CRUD Operations', () => {
    it('addUserHabit should add a habit with default streak 0', () => {
      const newHabitData = { title: 'New User Habit', frequency: 'Daily' as const, description: 'Desc' };
      const addedHabit = addUserHabit(newHabitData);

      expect(addedHabit.id).toBeDefined();
      expect(addedHabit.title).toBe('New User Habit');
      expect(addedHabit.frequency).toBe('Daily');
      expect(addedHabit.streak).toBe(0);
      expect(addedHabit.createdAt).toBeInstanceOf(Date);
      expect(addedHabit.updatedAt).toBeInstanceOf(Date);
      expect(addedHabit.lastCompleted).toBeUndefined();

      const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
      expect(storedHabits.length).toBe(1);
      expect(storedHabits[0].title).toBe('New User Habit');
      expect(storedHabits[0].streak).toBe(0);
    });

    it('updateUserHabit should update an existing habit and updatedAt', () => {
       const initialHabit = addUserHabit({ title: 'Initial Habit', frequency: 'Weekly' });
       const initialUpdatedAt = initialHabit.updatedAt;
       const updatedData = { id: initialHabit.id, description: 'Updated Desc', frequency: 'Monthly' as const };

       return new Promise<void>(resolve => setTimeout(resolve, 10)).then(() => {
           const result = updateUserHabit(updatedData);
           expect(result).toBeDefined();
           expect(result?.description).toBe('Updated Desc');
           expect(result?.frequency).toBe('Monthly');
           expect(result?.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());

           const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
           expect(storedHabits.length).toBe(1);
           expect(storedHabits[0].description).toBe('Updated Desc');
           expect(storedHabits[0].frequency).toBe('Monthly');
       });
    });

     it('updateUserHabit should not overwrite streak/lastCompleted if not provided', () => {
        const initialHabit = addUserHabit({ title: 'With Streak', frequency: 'Daily' });
        // Mark complete to set streak/lastCompleted
        const completedHabit = markUserHabitComplete(initialHabit.id);
        expect(completedHabit?.streak).toBe(1);
        expect(completedHabit?.lastCompleted).toBeDefined();

        const updatedData = { id: initialHabit.id, title: 'Updated Title Only' };
        const result = updateUserHabit(updatedData);

        expect(result).toBeDefined();
        expect(result?.title).toBe('Updated Title Only');
        expect(result?.streak).toBe(1); // Should remain 1
        expect(result?.lastCompleted?.getTime()).toEqual(completedHabit?.lastCompleted?.getTime()); // Should remain same date

        const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
        expect(storedHabits[0].streak).toBe(1);
     });


     it('deleteUserHabit should remove a habit', () => {
        const habit1 = addUserHabit({ title: 'Habit 1', frequency: 'Daily' });
        const habit2 = addUserHabit({ title: 'Habit 2', frequency: 'Daily' });

        const success = deleteUserHabit(habit1.id!);
        expect(success).toBe(true);

        const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
        expect(storedHabits.length).toBe(1);
        expect(storedHabits[0].id).toBe(habit2.id);
     });

     it('markUserHabitComplete should increment streak and set lastCompleted date', () => {
        const habit = addUserHabit({ title: 'Daily Task', frequency: 'Daily' });
        const today = startOfDay(new Date()).getTime();

        const result = markUserHabitComplete(habit.id);
        expect(result).toBeDefined();
        expect(result?.streak).toBe(1);
        expect(result?.lastCompleted).toBeInstanceOf(Date);
        expect(startOfDay(result!.lastCompleted!).getTime()).toEqual(today);

        const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
        expect(storedHabits[0].streak).toBe(1);
        expect(startOfDay(parseISO(storedHabits[0].lastCompleted)).getTime()).toEqual(today);
     });

      it('markUserHabitComplete should return null if already completed today', () => {
         const habit = addUserHabit({ title: 'Daily Task', frequency: 'Daily' });
         markUserHabitComplete(habit.id); // First completion
         const result = markUserHabitComplete(habit.id); // Second attempt on same day

         expect(result).toBeNull();
          const storedHabits = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY) || '[]');
         expect(storedHabits[0].streak).toBe(1); // Streak should not increase
      });

      // TODO: Add tests for streak logic based on frequency (Weekly, Monthly, Specific Days)
      // TODO: Add tests for streak reset logic
  });
});
