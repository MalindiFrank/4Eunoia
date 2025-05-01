'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO, startOfDay } from 'date-fns';
import { Target, Plus, Edit, Trash2, Check, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label component
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// --- Types and Schemas ---

type GoalStatus = 'Not Started' | 'In Progress' | 'Achieved' | 'On Hold';
type HabitFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Specific Days'; // Added Specific Days
type GrowthPace = 'Slow' | 'Moderate' | 'Aggressive';

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  targetDate?: Date; // Optional target completion date
  createdAt: Date;
  updatedAt: Date;
}

interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  specificDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat (only used if frequency is 'Specific Days')
  streak: number; // Current consecutive days/weeks/months achieved
  lastCompleted?: Date; // Last time the habit was marked complete
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = z.object({
  title: z.string().min(1, 'Goal title cannot be empty.'),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'In Progress', 'Achieved', 'On Hold']).default('Not Started'),
  // targetDate: z.date().optional(), // Date picker needed for this
});

const habitSchema = z.object({
  title: z.string().min(1, 'Habit title cannot be empty.'),
  description: z.string().optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Specific Days']).default('Daily'),
  // specificDays: z.array(z.number().min(0).max(6)).optional(), // TODO: Add multi-select for days
});

type GoalFormValues = z.infer<typeof goalSchema>;
type HabitFormValues = z.infer<typeof habitSchema>;

// --- Local Storage ---

const GOALS_STORAGE_KEY = 'prodev-goals';
const HABITS_STORAGE_KEY = 'prodev-habits';
const SETTINGS_STORAGE_KEY = 'prodev-growth-settings';

// Helper functions (reuse patterns from other pages)
const loadFromLocalStorage = <T,>(key: string, dateFields: (keyof T)[] = []): T[] => {
    if (typeof window === 'undefined') return [];
    const storedData = localStorage.getItem(key);
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData).map((item: any) => {
                const newItem = { ...item };
                dateFields.forEach(field => {
                    if (newItem[field]) {
                        newItem[field] = parseISO(newItem[field]);
                    }
                });
                return newItem;
            });
            // Sort goals/habits by update time or creation time
             if (parsedData.length > 0 && ('updatedAt' in parsedData[0] || 'createdAt' in parsedData[0])) {
                return parsedData.sort((a: any, b: any) =>
                    (b.updatedAt || b.createdAt).getTime() - (a.updatedAt || a.createdAt).getTime()
                );
            }
            return parsedData;
        } catch (e) {
            console.error(`Error parsing ${key} from localStorage:`, e);
            return [];
        }
    }
    return [];
};

const saveToLocalStorage = <T,>(key: string, data: T[], dateFields: (keyof T)[] = []) => {
    if (typeof window === 'undefined') return;
    try {
        const dataToStore = data.map(item => {
             const newItem = { ...item };
             dateFields.forEach(field => {
                 const dateValue = newItem[field] as Date | undefined;
                 if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                    (newItem as any)[field] = dateValue.toISOString();
                 }
             });
             return newItem;
         });
        localStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
};

// --- Component ---

const GoalsHabitsPage: FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [growthPace, setGrowthPace] = useState<GrowthPace>('Moderate');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const { toast } = useToast();

  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { title: '', description: '', status: 'Not Started' },
  });

  const habitForm = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { title: '', description: '', frequency: 'Daily' },
  });

  // Load data and settings on mount
  useEffect(() => {
    setGoals(loadFromLocalStorage<Goal>(GOALS_STORAGE_KEY, ['targetDate', 'createdAt', 'updatedAt']));
    setHabits(loadFromLocalStorage<Habit>(HABITS_STORAGE_KEY, ['lastCompleted', 'createdAt', 'updatedAt']));
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
        try {
            const { pace } = JSON.parse(storedSettings);
            if (['Slow', 'Moderate', 'Aggressive'].includes(pace)) {
                setGrowthPace(pace);
            }
        } catch (e) { console.error("Error parsing settings:", e); }
    }
  }, []);

   // Save settings when growthPace changes
   useEffect(() => {
        if (typeof window !== 'undefined') {
           saveToLocalStorage(SETTINGS_STORAGE_KEY, [{ pace: growthPace }]); // Store as an object in an array for consistency
        }
   }, [growthPace]);


  // --- Goal Handlers ---
  const openGoalDialog = (goal: Goal | null = null) => {
    setEditingGoal(goal);
    goalForm.reset(goal ? {
        title: goal.title,
        description: goal.description || '',
        status: goal.status,
        // targetDate: goal.targetDate, // Need date picker input
    } : { title: '', description: '', status: 'Not Started' });
    setIsGoalDialogOpen(true);
  };

  const closeGoalDialog = () => {
    setIsGoalDialogOpen(false);
    setEditingGoal(null);
  };

  const onGoalSubmit = (data: GoalFormValues) => {
    let updatedGoals;
    const now = new Date();
    if (editingGoal) {
        const updatedGoal: Goal = { ...editingGoal, ...data, updatedAt: now };
        updatedGoals = goals.map(g => g.id === editingGoal.id ? updatedGoal : g);
        toast({ title: "Goal Updated", description: `Goal "${data.title}" updated.` });
    } else {
        const newGoal: Goal = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
        updatedGoals = [newGoal, ...goals];
        toast({ title: "Goal Added", description: `Goal "${data.title}" created.` });
    }
    updatedGoals.sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    setGoals(updatedGoals);
    saveToLocalStorage<Goal>(GOALS_STORAGE_KEY, updatedGoals, ['targetDate', 'createdAt', 'updatedAt']);
    closeGoalDialog();
  };

  const deleteGoal = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    const remainingGoals = goals.filter(g => g.id !== goalId);
    setGoals(remainingGoals);
    saveToLocalStorage<Goal>(GOALS_STORAGE_KEY, remainingGoals, ['targetDate', 'createdAt', 'updatedAt']);
    toast({ title: "Goal Deleted", description: `Goal "${goalToDelete?.title}" deleted.`, variant: "destructive" });
  };

  // --- Habit Handlers ---
   const openHabitDialog = (habit: Habit | null = null) => {
     setEditingHabit(habit);
     habitForm.reset(habit ? {
         title: habit.title,
         description: habit.description || '',
         frequency: habit.frequency,
         // specificDays: habit.specificDays, // Need multi-select input
     } : { title: '', description: '', frequency: 'Daily' });
     setIsHabitDialogOpen(true);
   };

   const closeHabitDialog = () => {
     setIsHabitDialogOpen(false);
     setEditingHabit(null);
   };

   const onHabitSubmit = (data: HabitFormValues) => {
     let updatedHabits;
     const now = new Date();
     if (editingHabit) {
         const updatedHabit: Habit = { ...editingHabit, ...data, updatedAt: now };
         updatedHabits = habits.map(h => h.id === editingHabit.id ? updatedHabit : h);
         toast({ title: "Habit Updated", description: `Habit "${data.title}" updated.` });
     } else {
         const newHabit: Habit = {
             id: crypto.randomUUID(),
             ...data,
             streak: 0, // Start with 0 streak
             createdAt: now,
             updatedAt: now
         };
         updatedHabits = [newHabit, ...habits];
         toast({ title: "Habit Added", description: `Habit "${data.title}" created.` });
     }
     updatedHabits.sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime());
     setHabits(updatedHabits);
     saveToLocalStorage<Habit>(HABITS_STORAGE_KEY, updatedHabits, ['lastCompleted', 'createdAt', 'updatedAt']);
     closeHabitDialog();
   };

   const deleteHabit = (habitId: string) => {
     const habitToDelete = habits.find(h => h.id === habitId);
     const remainingHabits = habits.filter(h => h.id !== habitId);
     setHabits(remainingHabits);
     saveToLocalStorage<Habit>(HABITS_STORAGE_KEY, remainingHabits, ['lastCompleted', 'createdAt', 'updatedAt']);
     toast({ title: "Habit Deleted", description: `Habit "${habitToDelete?.title}" deleted.`, variant: "destructive" });
   };

   const markHabitComplete = (habitId: string) => {
        // Basic completion logic - real implementation needs checking frequency, dates etc.
        // This is a simplified version for demonstration.
        const today = startOfDay(new Date());
        let habitTitle = '';
        const updatedHabits = habits.map(h => {
            if (h.id === habitId) {
                habitTitle = h.title;
                // Crude check: only update if not completed today already
                if (!h.lastCompleted || startOfDay(h.lastCompleted) < today) {
                    return { ...h, streak: (h.streak || 0) + 1, lastCompleted: new Date(), updatedAt: new Date() };
                } else {
                     // Optionally provide feedback that it's already done today
                     toast({ title: "Already Completed", description: `Habit "${h.title}" marked complete today.`, variant: "default"});
                     return h; // No change
                 }
            }
            return h;
        }).sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Resort after update

         setHabits(updatedHabits);
         saveToLocalStorage<Habit>(HABITS_STORAGE_KEY, updatedHabits, ['lastCompleted', 'createdAt', 'updatedAt']);

         // Only show toast if the habit was actually marked complete now
         const updatedHabit = updatedHabits.find(h => h.id === habitId);
         // Check if the habit was updated by comparing lastCompleted timestamp or checking if it was previously null
         const wasJustCompleted = updatedHabit && (!editingHabit?.lastCompleted || editingHabit.lastCompleted !== updatedHabit.lastCompleted);

         if (updatedHabit && wasJustCompleted) {
              toast({ title: "Habit Completed!", description: `Great job on "${habitTitle}"! Streak: ${updatedHabit.streak}` });
         }
   };

   // --- Render ---

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" /> Goals & Habits
        </h1>
        {/* Growth Pace Setting */}
         <div className="flex items-center gap-2">
             <Label htmlFor="growth-pace" className="text-sm font-medium">Growth Pace:</Label>
             <Select value={growthPace} onValueChange={(value: GrowthPace) => setGrowthPace(value)}>
               <SelectTrigger id="growth-pace" className="w-[150px] h-9">
                 <SelectValue placeholder="Select pace" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="Slow">Slow</SelectItem>
                 <SelectItem value="Moderate">Moderate</SelectItem>
                 <SelectItem value="Aggressive">Aggressive</SelectItem>
               </SelectContent>
             </Select>
         </div>
      </div>

        {/* AI Suggestions Placeholder */}
       {/* <Card className="bg-primary/10 border-primary/30">
           <CardHeader className="pb-2">
               <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Smart Suggestions</CardTitle>
           </CardHeader>
           <CardContent>
               <p className="text-sm text-primary/80">Consider breaking down 'Learn Advanced JS' goal into smaller steps like 'Master Promises' this week.</p>
               {/* TODO: Add AI suggestion flow here */}
           {/* </CardContent>
       </Card> */}


      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Manage Goals</CardTitle>
                    <CardDescription>Define and track your long-term objectives.</CardDescription>
                </div>
                <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => openGoalDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Add Goal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
                        </DialogHeader>
                         <Form {...goalForm}>
                            <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4 py-4">
                                 <FormField control={goalForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Learn Spanish" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={goalForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Add details about the goal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={goalForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Not Started">Not Started</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Achieved">Achieved</SelectItem><SelectItem value="On Hold">On Hold</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                 {/* TODO: Add Date Picker for targetDate */}
                                 <DialogFooter>
                                     <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                     <Button type="submit">{editingGoal ? 'Update Goal' : 'Create Goal'}</Button>
                                 </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
               <ScrollArea className="h-[400px] w-full">
                    {goals.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">No goals defined yet. Add your first goal!</p>
                    ) : (
                         <div className="space-y-3">
                            {goals.map(goal => (
                                <div key={goal.id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-accent">
                                    <div className="flex-grow overflow-hidden pr-4">
                                        <p className="font-medium truncate">{goal.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{goal.description || 'No description'}</p>
                                        <p className="text-xs mt-1">Status: <span className={`font-medium ${goal.status === 'Achieved' ? 'text-green-600' : goal.status === 'In Progress' ? 'text-blue-600' : 'text-muted-foreground'}`}>{goal.status}</span></p>
                                        {/* <Progress value={goal.status === 'Achieved' ? 100 : goal.status === 'In Progress' ? 50 : 0} className="h-1.5 mt-1" /> */}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGoalDialog(goal)}><Edit className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Delete Goal?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the goal "{goal.title}".</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteGoal(goal.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                         </div>
                     )}
               </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Habits Tab */}
        <TabsContent value="habits" className="mt-6">
          <Card>
             <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Manage Habits</CardTitle>
                    <CardDescription>Build and track consistent routines.</CardDescription>
                </div>
                <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => openHabitDialog()}>
                             <Plus className="mr-2 h-4 w-4" /> Add Habit
                        </Button>
                    </DialogTrigger>
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
                        </DialogHeader>
                        <Form {...habitForm}>
                            <form onSubmit={habitForm.handleSubmit(onHabitSubmit)} className="space-y-4 py-4">
                                <FormField control={habitForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Drink water, Meditate" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={habitForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Why is this habit important?" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={habitForm.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Specific Days">Specific Days</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                {/* TODO: Add multi-select day picker if frequency is 'Specific Days' */}
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit">{editingHabit ? 'Update Habit' : 'Create Habit'}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                     </DialogContent>
                </Dialog>
             </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] w-full">
                    {habits.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">No habits defined yet. Add your first habit!</p>
                     ) : (
                        <div className="space-y-3">
                            {habits.map(habit => {
                                const isCompletedToday = habit.lastCompleted && startOfDay(habit.lastCompleted) >= startOfDay(new Date());
                                return (
                                    <div key={habit.id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-accent">
                                        <div className="flex-grow overflow-hidden pr-2">
                                            <p className="font-medium truncate">{habit.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{habit.description || 'No description'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs">Frequency: <span className="font-medium">{habit.frequency}</span></p>
                                                <p className="text-xs">Streak: <span className="font-medium">{habit.streak || 0} 🔥</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                             <Button
                                                 variant={isCompletedToday ? "secondary" : "outline"}
                                                 size="icon"
                                                 className="h-7 w-7"
                                                 onClick={() => markHabitComplete(habit.id)}
                                                 disabled={isCompletedToday}
                                                 title={isCompletedToday ? "Completed Today" : "Mark Complete"}
                                             >
                                                <Check className="h-4 w-4" />
                                                <span className="sr-only">{isCompletedToday ? "Completed Today" : "Mark Complete"}</span>
                                            </Button>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHabitDialog(habit)}><Edit className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Habit?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the habit "{habit.title}". Your streak will be lost.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteHabit(habit.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoalsHabitsPage;
