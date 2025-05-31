
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
// useDataMode is no longer needed for checking mock mode here
// import { useDataMode } from '@/context/data-mode-context'; 
import { getGoals, addUserGoal, updateUserGoal, deleteUserGoal, type Goal, type GoalStatus } from '@/services/goal'; 
import { getHabits, addUserHabit, updateUserHabit, deleteUserHabit, markUserHabitComplete, type Habit, type HabitFrequency } from '@/services/habit'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { SETTINGS_STORAGE_KEY } from '@/lib/theme-utils';


type GrowthPace = 'Slow' | 'Moderate' | 'Aggressive';

const goalSchema = z.object({
  title: z.string().min(1, 'Goal title cannot be empty.'),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'In Progress', 'Achieved', 'On Hold']).default('Not Started'),
});

const habitSchema = z.object({
  title: z.string().min(1, 'Habit title cannot be empty.'),
  description: z.string().optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Specific Days']).default('Daily'),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type HabitFormValues = z.infer<typeof habitSchema>;


const GoalsHabitsPage: FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [growthPace, setGrowthPace] = useState<GrowthPace>('Moderate');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const { toast } = useToast();
  // const { dataMode } = useDataMode(); // No longer needed for mock/user checks here

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingGoals(true);
      setIsLoadingHabits(true);
      try {
        const [loadedGoals, loadedHabits] = await Promise.all([
          getGoals(), // dataMode parameter removed
          getHabits(), // dataMode parameter removed
        ]);
        setGoals(loadedGoals);
        setHabits(loadedHabits);
      } catch (error) {
         console.error("Error loading goals/habits:", error);
         toast({ title: "Error", description: "Could not load goals or habits.", variant: "destructive" });
         setGoals([]);
         setHabits([]);
      } finally {
         setIsLoadingGoals(false);
         setIsLoadingHabits(false);
      }
    };

    loadData();

    if (typeof window !== 'undefined') {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            try {
                const settings = JSON.parse(storedSettings);
                if (settings?.preferences?.growthPace && ['Slow', 'Moderate', 'Aggressive'].includes(settings.preferences.growthPace)) {
                    setGrowthPace(settings.preferences.growthPace);
                }
            } catch (e) { console.error("Error parsing settings for growth pace:", e); }
        }
    }
  }, [toast]); // Removed dataMode from dependencies

   useEffect(() => {
        if (typeof window !== 'undefined') {
            const existingSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            let settings = {};
            if (existingSettings) {
                try { settings = JSON.parse(existingSettings); } catch (e) { console.error("Error parsing existing settings:", e); }
            }
           localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, preferences: { ...(settings as any).preferences, growthPace } }));
        }
   }, [growthPace]);


    const goalForm = useForm<GoalFormValues>({
        resolver: zodResolver(goalSchema),
        defaultValues: { title: '', description: '', status: 'Not Started' },
    });

    const habitForm = useForm<HabitFormValues>({
        resolver: zodResolver(habitSchema),
        defaultValues: { title: '', description: '', frequency: 'Daily' },
    });

  const openGoalDialog = (goal: Goal | null = null) => {
    setEditingGoal(goal);
    goalForm.reset(goal ? {
        title: goal.title,
        description: goal.description || '',
        status: goal.status,
    } : { title: '', description: '', status: 'Not Started' });
    setIsGoalDialogOpen(true);
  };

  const closeGoalDialog = () => {
    setIsGoalDialogOpen(false);
    setEditingGoal(null);
    goalForm.reset(); 
  };

  const onGoalSubmit = (data: GoalFormValues) => {
    try {
        let savedGoal: Goal | undefined;
        if (editingGoal) {
            savedGoal = updateUserGoal({ ...data, id: editingGoal.id });
            if (savedGoal) {
                setGoals(prev => prev.map(g => g.id === savedGoal!.id ? savedGoal! : g).sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
                toast({ title: "Goal Updated", description: `Goal "${data.title}" updated.` });
            } else {
                 throw new Error("Failed to find goal to update.");
            }
        } else {
            savedGoal = addUserGoal(data);
            setGoals(prev => [savedGoal, ...prev].sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
            toast({ title: "Goal Added", description: `Goal "${data.title}" created.` });
        }
    } catch (error) {
         console.error("Error saving goal:", error);
         toast({ title: "Error", description: "Could not save goal.", variant: "destructive"});
    } finally {
        closeGoalDialog();
    }
  };

  const deleteGoal = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
     try {
         const success = deleteUserGoal(goalId);
         if (success) {
            setGoals(prev => prev.filter(g => g.id !== goalId));
            toast({ title: "Goal Deleted", description: `Goal "${goalToDelete?.title}" deleted.`, variant: "default" }); 
         } else {
              throw new Error("Failed to find goal to delete.");
         }
     } catch (error) {
          console.error("Error deleting goal:", error);
          toast({ title: "Error", description: "Could not delete goal.", variant: "destructive"});
     }
  };

   const openHabitDialog = (habit: Habit | null = null) => {
     setEditingHabit(habit);
     habitForm.reset(habit ? {
         title: habit.title,
         description: habit.description || '',
         frequency: habit.frequency,
     } : { title: '', description: '', frequency: 'Daily' });
     setIsHabitDialogOpen(true);
   };

   const closeHabitDialog = () => {
     setIsHabitDialogOpen(false);
     setEditingHabit(null);
     habitForm.reset(); 
   };

   const onHabitSubmit = (data: HabitFormValues) => {
        try {
             let savedHabit: Habit | undefined;
             if (editingHabit) {
                 savedHabit = updateUserHabit({ ...data, id: editingHabit.id });
                  if (savedHabit) {
                     setHabits(prev => prev.map(h => h.id === savedHabit!.id ? savedHabit! : h).sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
                     toast({ title: "Habit Updated", description: `Habit "${data.title}" updated.` });
                 } else {
                     throw new Error("Failed to find habit to update.");
                 }
             } else {
                 savedHabit = addUserHabit(data);
                 setHabits(prev => [savedHabit, ...prev].sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
                 toast({ title: "Habit Added", description: `Habit "${data.title}" created.` });
             }
        } catch(error) {
             console.error("Error saving habit:", error);
             toast({ title: "Error", description: "Could not save habit.", variant: "destructive"});
        } finally {
             closeHabitDialog();
        }
   };

   const deleteHabit = (habitId: string) => {
     const habitToDelete = habits.find(h => h.id === habitId);
     try {
         const success = deleteUserHabit(habitId);
          if (success) {
             setHabits(prev => prev.filter(h => h.id !== habitId));
             toast({ title: "Habit Deleted", description: `Habit "${habitToDelete?.title}" deleted.`, variant: "default" }); 
         } else {
              throw new Error("Failed to find habit to delete.");
         }
     } catch (error) {
          console.error("Error deleting habit:", error);
          toast({ title: "Error", description: "Could not delete habit.", variant: "destructive"});
     }
   };

   const markHabitCompleteHandler = (habitId: string) => {
         try {
             const updatedHabit = markUserHabitComplete(habitId);
             if (updatedHabit) {
                 setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h).sort((a,b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
                 toast({ title: "Habit Completed!", description: `Great job on "${updatedHabit.title}"! Streak: ${updatedHabit.streak}` });
             } else {
                  const habit = habits.find(h => h.id === habitId);
                  if (habit) {
                      toast({ title: "Already Completed", description: `Habit "${habit.title}" marked complete today.`, variant: "default"});
                  }
             }
         } catch (error) {
              console.error("Error marking habit complete:", error);
              toast({ title: "Error", description: "Could not mark habit complete.", variant: "destructive"});
         }
   };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" /> Goals & Habits
        </h1>
         <div className="flex items-center gap-2">
             <Label htmlFor="growth-pace" className="text-sm font-medium flex-shrink-0">Growth Pace:</Label>
             <Select value={growthPace} onValueChange={(value: GrowthPace) => setGrowthPace(value)}>
               <SelectTrigger id="growth-pace" className="w-[150px] h-9" aria-label="Select growth pace">
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

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <CardTitle>Manage Goals</CardTitle>
                    <CardDescription>Define and track your long-term objectives.</CardDescription>
                </div>
                <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => openGoalDialog()} className="shadow-md">
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
                    {isLoadingGoals ? (
                         <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                         </div>
                    ) : goals.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">
                             No goals defined yet. Add your first goal!
                         </p>
                    ) : (
                         <div className="space-y-3">
                            {goals.map(goal => (
                                <div key={goal.id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-accent transition-colors shadow-sm">
                                    <div className="flex-grow overflow-hidden pr-4">
                                        <p className="font-medium truncate">{goal.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{goal.description || 'No description'}</p>
                                        <p className="text-xs mt-1">Status: <span className={`font-medium ${goal.status === 'Achieved' ? 'text-green-600 dark:text-green-400' : goal.status === 'In Progress' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>{goal.status}</span></p>
                                        {goal.targetDate && <p className="text-xs text-muted-foreground">Target: {format(goal.targetDate, 'PP')}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"> 
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGoalDialog(goal)} aria-label={`Edit goal "${goal.title}"`}><Edit className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete goal "${goal.title}"`}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button></AlertDialogTrigger>
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

        <TabsContent value="habits" className="mt-6">
          <Card className="shadow-lg">
             <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <CardTitle>Manage Habits</CardTitle>
                    <CardDescription>Build and track consistent routines.</CardDescription>
                </div>
                <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => openHabitDialog()} className="shadow-md">
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
                    {isLoadingHabits ? (
                        <div className="space-y-3">
                             {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                         </div>
                     ) : habits.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">
                            No habits defined yet. Add your first habit!
                         </p>
                     ) : (
                        <div className="space-y-3">
                            {habits.map(habit => {
                                const isCompletedToday = habit.lastCompleted && startOfDay(habit.lastCompleted) >= startOfDay(new Date());
                                return (
                                    <div key={habit.id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-accent transition-colors shadow-sm">
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
                                                 className="h-7 w-7 shadow-sm"
                                                 onClick={() => markHabitCompleteHandler(habit.id)}
                                                 disabled={isCompletedToday}
                                                 aria-label={isCompletedToday ? `Habit "${habit.title}" completed today` : `Mark habit "${habit.title}" as complete`}
                                             >
                                                <Check className="h-4 w-4" />
                                                <span className="sr-only">{isCompletedToday ? "Completed Today" : "Mark Complete"}</span>
                                            </Button>
                                            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1"> 
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHabitDialog(habit)} aria-label={`Edit habit "${habit.title}"`}><Edit className="h-4 w-4" /><span className="sr-only">Edit</span></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete habit "${habit.title}"`}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button></AlertDialogTrigger>
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
