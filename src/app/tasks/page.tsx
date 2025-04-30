'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Check, Edit, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/services/task'; // Import Task type
// import { getTasks as fetchTasks } from '@/services/task'; // Import service function - We'll use localStorage now

// Local storage key
const LOCAL_STORAGE_KEY = 'prodev-tasks';

const taskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty.'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// Mock Data Generation
const generateMockTasks = (): Task[] => {
    const today = new Date();
    return [
        { id: 'task-mock-1', title: 'Finalize Q3 report', description: 'Compile data and write summary', dueDate: addDays(today, 2), status: 'In Progress' },
        { id: 'task-mock-2', title: 'Schedule team sync meeting', description: 'Find a time that works for everyone', dueDate: addDays(today, 1), status: 'Pending' },
        { id: 'task-mock-3', title: 'Review design mockups', description: 'Provide feedback on the new UI', dueDate: subDays(today, 1), status: 'Completed' }, // Completed past task
        { id: 'task-mock-4', title: 'Update project documentation', description: '', dueDate: addDays(today, 7), status: 'Pending' },
        { id: 'task-mock-5', title: 'Pay electricity bill', description: 'Due by the 15th', dueDate: addDays(today, 5), status: 'Pending' },
        { id: 'task-mock-6', title: 'Research competitor features', description: '', status: 'In Progress' }, // No due date
        { id: 'task-mock-7', title: 'Book flight for conference', description: 'Check prices and book', status: 'Pending' }, // No due date
        { id: 'task-mock-8', title: 'Submit expense report', description: 'For last month\'s travel', dueDate: subDays(today, 3), status: 'Completed' }, // Completed past task
    ];
};


// Function to load tasks from localStorage or generate mock data
const loadTasksFromLocalStorage = (): Task[] => {
    if (typeof window === 'undefined') return [];
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
        try {
            // Parse and ensure dates are Date objects
            return JSON.parse(storedTasks).map((task: any) => ({
                ...task,
                dueDate: task.dueDate ? parseISO(task.dueDate) : undefined, // Convert string back to Date or undefined
            }));
        } catch (e) {
            console.error("Error parsing tasks from localStorage:", e);
             // Fallback to mock data if parsing fails
            return generateMockTasks();
        }
    }
    // If no stored tasks, generate mock data
    const mockTasks = generateMockTasks();
    saveTasksToLocalStorage(mockTasks); // Save mock data initially
    return mockTasks;
};

// Function to save tasks to localStorage
const saveTasksToLocalStorage = (tasks: Task[]) => {
     if (typeof window === 'undefined') return;
    try {
        // Store dates as ISO strings for JSON compatibility
        const tasksToStore = tasks.map(task => ({
            ...task,
            dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasksToStore));
    } catch (e) {
        console.error("Error saving tasks to localStorage:", e);
    }
};


const TasksPage: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Not really loading from API anymore
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load tasks on initial render
  useEffect(() => {
    setTasks(loadTasksFromLocalStorage());
  }, []);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      status: 'Pending',
    },
  });

   const openDialog = (task: Task | null = null) => {
     setEditingTask(task);
     if (task) {
       form.reset({
         title: task.title,
         description: task.description || '',
         dueDate: task.dueDate, // Already Date object from loading
         status: task.status,
       });
     } else {
       form.reset({
         title: '',
         description: '',
         dueDate: undefined,
         status: 'Pending',
       });
     }
     setIsDialogOpen(true);
   };

  const closeDialog = () => {
     setIsDialogOpen(false);
     setEditingTask(null);
     form.reset();
   };


  const onSubmit = (data: TaskFormValues) => {
    let updatedTasks: Task[];
    if (editingTask) {
      // Update existing task
      const updatedTask: Task = { ...editingTask, ...data };
      updatedTasks = tasks.map((t) => (t.id === editingTask.id ? updatedTask : t));
      toast({ title: "Task Updated", description: `Task "${data.title}" has been updated.` });
      console.log('Updated Task:', updatedTask);
    } else {
      // Add new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        ...data,
      };
      updatedTasks = [newTask, ...tasks]; // Prepend new task
       toast({ title: "Task Added", description: `Task "${data.title}" has been added.` });
      console.log('New Task:', newTask);
    }
     setTasks(updatedTasks);
     saveTasksToLocalStorage(updatedTasks); // Save changes
     closeDialog();
  };

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    saveTasksToLocalStorage(updatedTasks); // Save changes
    toast({ title: "Task Deleted", description: `Task "${taskToDelete?.title}" has been deleted.`, variant: "destructive" });
     console.log('Deleted Task ID:', taskId);
  };

  const toggleTaskStatus = (taskId: string) => {
    let updatedTaskTitle = '';
    const updatedTasks = tasks.map((task) => {
        if (task.id === taskId) {
            const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
            updatedTaskTitle = task.title; // Capture title before update
             return { ...task, status: newStatus };
        }
        return task;
     });

    setTasks(updatedTasks);
    saveTasksToLocalStorage(updatedTasks); // Save changes

     const changedTask = updatedTasks.find(t => t.id === taskId);
     if (changedTask) {
       toast({ title: "Task Status Updated", description: `Task "${updatedTaskTitle}" marked as ${changedTask.status}.` });
       console.log('Toggled Task Status:', changedTask);
     }
  };

  // Simple sort function (optional, can be done on render)
   const sortedTasks = useMemo(() => {
     return [...tasks].sort((a, b) => {
       // Sort by status (Pending > In Progress > Completed), then by due date (earlier first)
       const statusOrder = { 'Pending': 0, 'In Progress': 1, 'Completed': 2 };
       if (statusOrder[a.status] !== statusOrder[b.status]) {
         return statusOrder[a.status] - statusOrder[b.status];
       }
       const dateA = a.dueDate?.getTime() ?? Infinity;
       const dateB = b.dueDate?.getTime() ?? Infinity;
       return dateA - dateB;
     });
   }, [tasks]);


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => openDialog()}>
               <Plus className="mr-2 h-4 w-4" /> Add Task
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
             </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                     <FormField
                       control={form.control}
                       name="title"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Title</FormLabel>
                           <FormControl>
                             <Input placeholder="Task title" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                      <FormField
                         control={form.control}
                         name="description"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Description (Optional)</FormLabel>
                             <FormControl>
                               <Textarea placeholder="Add more details about the task" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                    <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-[240px] pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                   // Allow selecting past dates if needed for editing
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}> {/* Controlled component */}
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <div className="flex justify-end gap-2 pt-4">
                         <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                         <Button type="submit">{editingTask ? 'Update Task' : 'Add Task'}</Button>
                     </div>
                  </form>
                </Form>
           </DialogContent>
         </Dialog>
      </div>

        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Your Tasks</CardTitle>
                <CardDescription>Manage your upcoming and completed tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] w-full">
                    {isLoading ? ( // Can remove this or adapt if needed
                        <p className="text-center text-muted-foreground">Loading tasks...</p>
                    ) : sortedTasks.length === 0 ? (
                        <p className="text-center text-muted-foreground">No tasks yet. Add your first task!</p>
                    ) : (
                        sortedTasks.map((task, index) => (
                            <React.Fragment key={task.id}>
                                <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent group"> {/* Added group */}
                                    <div className="flex items-start gap-3"> {/* Changed items-center to items-start */}
                                        <Checkbox
                                            id={`task-${task.id}`}
                                            checked={task.status === 'Completed'}
                                            onCheckedChange={() => toggleTaskStatus(task.id)}
                                            className="mt-1" // Align checkbox with first line of text
                                        />
                                        <div className="grid gap-0.5">
                                            <label
                                                htmlFor={`task-${task.id}`}
                                                className={cn(
                                                    "text-sm font-medium leading-tight cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70", // Added cursor-pointer
                                                    task.status === 'Completed' && 'line-through text-muted-foreground'
                                                )}
                                                onClick={() => toggleTaskStatus(task.id)} // Allow toggling by clicking label
                                            >
                                                {task.title}
                                            </label>
                                            {task.description && (
                                                <p className={cn("text-xs text-muted-foreground", task.status === 'Completed' && 'line-through')}>
                                                    {task.description}
                                                </p>
                                            )}
                                             {task.dueDate && (
                                               <p className={cn("text-xs text-muted-foreground", task.status === 'Completed' && 'line-through')}>
                                                 Due: {format(task.dueDate, 'PPP')} {/* Already Date object */}
                                               </p>
                                              )}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit mt-1 ${
                                                  task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : // Added dark mode styles
                                                  task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                              }`}>
                                                {task.status}
                                              </span>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"> {/* Show on hover/focus */}
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(task)}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Edit Task</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTask(task.id)}>
                                            <Trash2 className="h-4 w-4" />
                                             <span className="sr-only">Delete Task</span>
                                        </Button>
                                    </div>
                                </div>
                                {index < sortedTasks.length - 1 && <Separator />}
                            </React.Fragment>
                        ))
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
};

export default TasksPage;
