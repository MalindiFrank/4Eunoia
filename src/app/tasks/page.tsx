'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { getTasks as fetchTasks } from '@/services/task'; // Import service function

const taskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty.'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const TasksPage: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      status: 'Pending',
    },
  });

   useEffect(() => {
     const loadTasks = async () => {
       try {
         setIsLoading(true);
         const fetchedTasks = await fetchTasks();
         setTasks(fetchedTasks);
       } catch (error) {
         console.error("Failed to fetch tasks:", error);
         toast({
           title: "Error",
           description: "Could not load tasks.",
           variant: "destructive",
         });
       } finally {
         setIsLoading(false);
       }
     };
     loadTasks();
   }, [toast]);

   const openDialog = (task: Task | null = null) => {
     setEditingTask(task);
     if (task) {
       form.reset({
         title: task.title,
         description: task.description || '',
         dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
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
    if (editingTask) {
      // Update existing task
      const updatedTask: Task = { ...editingTask, ...data };
      setTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));
      toast({ title: "Task Updated", description: `Task "${data.title}" has been updated.` });
      // TODO: Call API to update task
      console.log('Updated Task:', updatedTask);
    } else {
      // Add new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        ...data,
      };
      setTasks([newTask, ...tasks]);
       toast({ title: "Task Added", description: `Task "${data.title}" has been added.` });
      // TODO: Call API to add task
      console.log('New Task:', newTask);
    }
     closeDialog();
  };

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(tasks.filter((t) => t.id !== taskId));
    toast({ title: "Task Deleted", description: `Task "${taskToDelete?.title}" has been deleted.`, variant: "destructive" });
    // TODO: Call API to delete task
     console.log('Deleted Task ID:', taskId);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'Completed' ? 'Pending' : 'Completed',
            }
          : task
      )
    );
     const updatedTask = tasks.find(t => t.id === taskId);
     if (updatedTask) {
       toast({ title: "Task Status Updated", description: `Task "${updatedTask.title}" marked as ${updatedTask.status === 'Completed' ? 'Pending' : 'Completed'}.` });
       // TODO: Call API to update task status
       console.log('Toggled Task Status:', updatedTask);
     }
  };

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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    {isLoading ? (
                        <p className="text-center text-muted-foreground">Loading tasks...</p>
                    ) : tasks.length === 0 ? (
                        <p className="text-center text-muted-foreground">No tasks yet. Add your first task!</p>
                    ) : (
                        tasks.map((task, index) => (
                            <React.Fragment key={task.id}>
                                <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id={`task-${task.id}`}
                                            checked={task.status === 'Completed'}
                                            onCheckedChange={() => toggleTaskStatus(task.id)}
                                        />
                                        <div className="grid gap-0.5">
                                            <label
                                                htmlFor={`task-${task.id}`}
                                                className={cn(
                                                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                                    task.status === 'Completed' && 'line-through text-muted-foreground'
                                                )}
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
                                                 Due: {format(new Date(task.dueDate), 'PPP')}
                                               </p>
                                              )}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit mt-1 ${
                                                  task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                  task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-gray-100 text-gray-800'
                                              }`}>
                                                {task.status}
                                              </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                {index < tasks.length - 1 && <Separator />}
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
