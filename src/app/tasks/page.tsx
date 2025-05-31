
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns'; 
import { Calendar as CalendarIcon, Check, Edit, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/services/task'; 
import { getTasks, addUserTask, updateUserTask, deleteUserTask, toggleUserTaskStatus } from '@/services/task'; 
// useDataMode is no longer needed for checking mock mode here
// import { useDataMode } from '@/context/data-mode-context'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; 
import { Skeleton } from '@/components/ui/skeleton'; 

const taskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty.'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
});

type TaskFormValues = z.infer<typeof taskSchema>;


const TaskForm: FC<{
    onClose: () => void;
    initialData?: Task | null;
    onSave: (task: Task) => void;
}> = ({ onClose, initialData, onSave }) => {
    const { toast } = useToast();

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: initialData ? {
            title: initialData.title,
            description: initialData.description || '',
            dueDate: initialData.dueDate,
            status: initialData.status,
        } : {
            title: '',
            description: '',
            dueDate: undefined,
            status: 'Pending',
        },
    });

    const onSubmit = (data: TaskFormValues) => {
        const taskData: Omit<Task, 'id' | 'createdAt'> = data; 

        try {
            let savedTask: Task | undefined;
            if (initialData?.id) {
                savedTask = updateUserTask({ ...initialData, ...taskData });
                 if (savedTask) {
                    toast({ title: "Task Updated", description: `Task "${data.title}" updated.` });
                 } else {
                     throw new Error("Failed to find task to update.");
                 }
            } else {
                savedTask = addUserTask(taskData);
                toast({ title: "Task Added", description: `Task "${data.title}" added.` });
            }
            if (savedTask) {
                 onSave(savedTask);
            }
        } catch (error) {
             console.error("Error saving task:", error);
             toast({ title: "Error", description: "Could not save task.", variant: "destructive"});
        } finally {
             onClose();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl> <Input placeholder="Task title" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl> <Textarea placeholder="Add more details about the task" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Due Date (Optional)</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={'outline'} className={cn( 'w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground' )}> {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select status" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="Pending">Pending</SelectItem> <SelectItem value="In Progress">In Progress</SelectItem> <SelectItem value="Completed">Completed</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">{initialData ? 'Update Task' : 'Add Task'}</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};


const TasksPage: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  // const { dataMode } = useDataMode(); // No longer needed for mock/user checks here

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const loadedTasks = await getTasks(); // dataMode parameter removed
        setTasks(loadedTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        toast({ title: "Error", description: "Could not load tasks.", variant: "destructive" });
         setTasks([]); 
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, [toast]); // Removed dataMode from dependencies


   const openDialog = (task: Task | null = null) => {
     setEditingTask(task);
     setIsDialogOpen(true);
   };

  const closeDialog = () => {
     setIsDialogOpen(false);
     setEditingTask(null);
   };

    const handleSaveTask = (savedTask: Task) => {
        setTasks(prev => {
             const existing = prev.find(t => t.id === savedTask.id);
             if (existing) {
                 return prev.map(t => t.id === savedTask.id ? savedTask : t);
             } else {
                 return [savedTask, ...prev];
             }
        });
        closeDialog();
    };

    const handleDeleteTask = (taskId: string) => {
       const taskToDelete = tasks.find(t => t.id === taskId);
       try {
           const success = deleteUserTask(taskId);
            if (success) {
               setTasks(prev => prev.filter(t => t.id !== taskId));
               toast({ title: "Task Deleted", description: `Task "${taskToDelete?.title}" deleted.`, variant: "default" });
            } else {
                 throw new Error("Failed to find task to delete.");
            }
       } catch (error) {
            console.error("Error deleting task:", error);
            toast({ title: "Error", description: "Could not delete task.", variant: "destructive"});
       }
   };

    const handleToggleTaskStatus = (taskId: string) => {
        try {
            const updatedTask = toggleUserTaskStatus(taskId);
            if (updatedTask) {
                 setTasks(prevTasks =>
                     prevTasks.map(task =>
                         task.id === taskId ? updatedTask : task
                     )
                 );
                 toast({ title: "Task Status Updated", description: `Task "${updatedTask.title}" marked as ${updatedTask.status}.` });
            } else {
                 throw new Error("Failed to toggle task status.");
            }
        } catch(error) {
             console.error("Error toggling task status:", error);
             toast({ title: "Error", description: "Could not update task status.", variant: "destructive"});
        }
    };


   const sortedTasks = useMemo(() => {
     return [...tasks].sort((a, b) => {
       const statusOrder = { 'Pending': 0, 'In Progress': 1, 'Completed': 2 };
       if (statusOrder[a.status] !== statusOrder[b.status]) {
         return statusOrder[a.status] - statusOrder[b.status];
       }
       const dateA = a.dueDate?.getTime() ?? Infinity; 
       const dateB = b.dueDate?.getTime() ?? Infinity;
        if (dateA !== dateB) {
            return dateA - dateB; 
        }
        const createdA = a.createdAt?.getTime() ?? 0;
        const createdB = b.createdAt?.getTime() ?? 0;
        return createdB - createdA;
     });
   }, [tasks]);


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => openDialog()} className="shadow-md">
               <Plus className="mr-2 h-4 w-4" /> Add Task
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
             </DialogHeader>
               <TaskForm
                    onClose={closeDialog}
                    initialData={editingTask}
                    onSave={handleSaveTask}
                />
           </DialogContent>
         </Dialog>
      </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Your Tasks</CardTitle>
                <CardDescription>Manage your upcoming and completed tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] w-full">
                    {isLoading ? (
                         <div className="space-y-4 p-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                         </div>
                    ) : sortedTasks.length === 0 ? (
                        <p className="text-center text-muted-foreground pt-10">
                           No tasks yet. Add your first task!
                        </p>
                    ) : (
                        sortedTasks.map((task, index) => (
                            <React.Fragment key={task.id}>
                                <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent group shadow-sm">
                                    <div className="flex items-start gap-3 flex-grow overflow-hidden"> 
                                        <Checkbox
                                            id={`task-${task.id}`}
                                            checked={task.status === 'Completed'}
                                            onCheckedChange={() => handleToggleTaskStatus(task.id)}
                                            className="mt-1 flex-shrink-0" 
                                            aria-label={`Mark task "${task.title}" as ${task.status === 'Completed' ? 'incomplete' : 'complete'}`} 
                                        />
                                        <div className="grid gap-0.5 flex-grow">
                                            <label
                                                htmlFor={`task-${task.id}`} 
                                                className={cn(
                                                    "text-sm font-medium leading-tight cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                                    task.status === 'Completed' && 'line-through text-muted-foreground'
                                                )}
                                            >
                                                {task.title}
                                            </label>
                                            {task.description && (
                                                <p className={cn("text-xs text-muted-foreground break-words", task.status === 'Completed' && 'line-through')}> 
                                                    {task.description}
                                                </p>
                                            )}
                                             {task.dueDate && (
                                               <p className={cn("text-xs text-muted-foreground", task.status === 'Completed' && 'line-through')}>
                                                 Due: {format(task.dueDate, 'PPP')}
                                               </p>
                                              )}
                                             <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit mt-1 ${
                                                  task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                  task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                              }`}>
                                                {task.status}
                                              </span>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(task)} aria-label={`Edit task "${task.title}"`}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Edit Task</span>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete task "${task.title}"`}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete Task</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Delete Task?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the task "{task.title}"?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTask(task.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
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
