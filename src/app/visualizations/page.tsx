'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Line, LineChart } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns'; // Removed addDays, subDays
import { Loader2, BarChartBig, PieChart as PieIcon, CalendarDays } from 'lucide-react'; // Removed specific icons for data types

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode

// Import service functions
import { getDailyLogs, type LogEntry } from '@/services/daily-log';
import { getTasks, type Task } from '@/services/task';
import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';
import { getExpenses, type Expense } from '@/services/expense';
import { getNotes, type Note } from '@/services/note';


// --- Chart Configs ---
const taskStatusConfig = {
  tasks: { label: "Tasks" },
  Pending: { label: "Pending", color: "hsl(var(--chart-2))" },
  'In Progress': { label: "In Progress", color: "hsl(var(--chart-4))" },
  Completed: { label: "Completed", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const baseExpensesConfig = { // Base config for known categories
    amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
    Food: { label: "Food", color: "hsl(var(--chart-1))" },
    Transport: { label: "Transport", color: "hsl(var(--chart-2))" },
    Entertainment: { label: "Entertainment", color: "hsl(var(--chart-3))" },
    Utilities: { label: "Utilities", color: "hsl(var(--chart-4))" },
    Housing: { label: "Housing", color: "hsl(var(--chart-5))" },
    Shopping: { label: "Shopping", color: "hsl(var(--chart-1))" },
    Health: { label: "Health", color: "hsl(var(--chart-2))" },
    Other: { label: "Other", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const activityConfig = {
    logs: { label: "Logs", color: "hsl(var(--chart-1))" },
    events: { label: "Events", color: "hsl(var(--chart-2))" },
    notes: { label: "Notes", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


const VisualizationsPage: FC = () => {
  const [dailyLogs, setDailyLogs] = useState<LogEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { dataMode } = useDataMode(); // Use data mode context

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
          // Fetch all data types using the current dataMode
        const [logData, taskData, eventData, expenseData, noteData] = await Promise.all([
          getDailyLogs(dataMode),
          getTasks(dataMode),
          getCalendarEvents(dataMode), // Let the service handle mock/user
          getExpenses(dataMode),
          getNotes(dataMode),
        ]);
        setDailyLogs(logData);
        setTasks(taskData);
        setCalendarEvents(eventData);
        setExpenses(expenseData);
        setNotes(noteData);
      } catch (error) {
        console.error("Failed to load data for visualizations:", error);
        toast({
          title: "Error Loading Data",
          description: "Could not load all data needed for visualizations.",
          variant: "destructive",
        });
         // Clear data on error
         setDailyLogs([]);
         setTasks([]);
         setCalendarEvents([]);
         setExpenses([]);
         setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [dataMode, toast]); // Reload when dataMode changes

  // --- Data Processing for Charts ---
  const taskStatusData = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<Task['status'], number>);
    const statuses: Task['status'][] = ['Pending', 'In Progress', 'Completed'];
    return statuses.map(status => ({ status, count: counts[status] || 0 })).filter(item => item.count > 0); // Filter out zero counts for pie chart
  }, [tasks]);

   const expensesByCategoryData = useMemo(() => {
     const byCategory = expenses.reduce((acc, expense) => {
       acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
       return acc;
     }, {} as Record<string, number>);
     return Object.entries(byCategory)
       .map(([category, amount]) => ({ category, amount: parseFloat(amount.toFixed(2)) }))
       .sort((a, b) => b.amount - a.amount);
   }, [expenses]);

  const activityFrequencyData = useMemo(() => {
     const today = new Date();
     const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
     const end = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
     const weekDays = eachDayOfInterval({ start, end });

      const counts: Record<string, { date: string; logs: number; events: number; notes: number }> = {};
      weekDays.forEach(day => {
          const formattedDate = format(day, 'MMM d');
          counts[formattedDate] = { date: formattedDate, logs: 0, events: 0, notes: 0 };
      });

     dailyLogs.forEach(log => {
          if (isWithinInterval(log.date, { start, end })) {
            const formattedDate = format(log.date, 'MMM d');
             if (counts[formattedDate]) counts[formattedDate].logs += 1;
         }
     });
     // Filter calendar events for the current week for this chart
     const weekEvents = calendarEvents.filter(event => isWithinInterval(event.start, {start, end}));
      weekEvents.forEach(event => {
         const formattedDate = format(event.start, 'MMM d');
         if (counts[formattedDate]) counts[formattedDate].events += 1;
      });
      notes.forEach(note => {
         if (isWithinInterval(note.createdAt, { start, end })) {
             const formattedDate = format(note.createdAt, 'MMM d');
              if (counts[formattedDate]) counts[formattedDate].notes += 1;
         }
      });

     return Object.values(counts);
   }, [dailyLogs, calendarEvents, notes]); // Include calendarEvents here

   // Dynamic Expenses Chart Config
   const expensesChartConfig = useMemo(() => {
        const config: ChartConfig = { ...baseExpensesConfig };
        expensesByCategoryData.forEach((item, index) => {
            if (!config[item.category]) {
                // Assign a fallback color if not predefined
                config[item.category] = {
                    label: item.category,
                    color: `hsl(var(--chart-${(index % 5) + 1}))` // Cycle through 5 chart colors
                };
            }
        });
        return config;
     }, [expensesByCategoryData]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading Visualizations...
        </h1>
        <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-[250px] w-full" /></CardContent></Card>
             <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-[250px] w-full" /></CardContent></Card>
             <Card className="md:col-span-2"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Visualizations</h1>

      <div className="grid gap-6 md:grid-cols-2">

        {/* Task Status Distribution (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5" /> Task Status Distribution</CardTitle>
            <CardDescription>Overview of task statuses ({dataMode === 'mock' ? 'Mock Data' : 'Your Data'}).</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full flex items-center justify-center">
            {tasks.length > 0 && taskStatusData.length > 0 ? (
                <ChartContainer config={taskStatusConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                        <Pie data={taskStatusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={50} labelLine={false}>
                         {taskStatusData.map((entry) => (
                             <Cell key={`cell-${entry.status}`} fill={`var(--color-${entry.status.replace(/\s+/g, '')}, hsl(var(--muted)))`} />
                          ))}
                         </Pie>
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                 <div className="h-full w-full flex items-center justify-center">
                     <p className="text-muted-foreground">No task data available.</p>
                 </div>
            )}
          </CardContent>
        </Card>


        {/* Expenses by Category (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChartBig className="h-5 w-5" /> Expenses by Category</CardTitle>
            <CardDescription>Spending distribution ({dataMode === 'mock' ? 'Mock Data' : 'Your Data'}).</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full">
            {expensesByCategoryData.length > 0 ? (
              <ChartContainer config={expensesChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategoryData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} fontSize={10}/>
                     <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" nameKey="category" />} />
                     <Bar dataKey="amount" layout="vertical" radius={4} barSize={20}>
                        {expensesByCategoryData.map((entry) => (
                            <Cell key={`cell-${entry.category}`} fill={`var(--color-${entry.category}, hsl(var(--primary)))`} />
                         ))}
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
               <div className="h-full w-full flex items-center justify-center">
                    <p className="text-muted-foreground">No expense data available.</p>
               </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Frequency This Week (Line Chart) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Activity Frequency (This Week)</CardTitle>
            <CardDescription>Logs, Events, and Notes per day this week ({dataMode === 'mock' ? 'Mock Data' : 'Your Data'}).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
             {activityFrequencyData.some(d => d.logs > 0 || d.events > 0 || d.notes > 0) ? (
               <ChartContainer config={activityConfig} className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={activityFrequencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="date" fontSize={10} tickMargin={5} axisLine={false} tickLine={false} />
                     <YAxis fontSize={10} tickMargin={5} axisLine={false} tickLine={false} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                        <Legend />
                      <Line type="monotone" dataKey="logs" name="Daily Logs" stroke="var(--color-logs)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="events" name="Calendar Events" stroke="var(--color-events)" strokeWidth={2} dot={false} />
                       <Line type="monotone" dataKey="notes" name="Notes Created" stroke="var(--color-notes)" strokeWidth={2} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </ChartContainer>
            ) : (
                 <div className="h-full w-full flex items-center justify-center">
                    <p className="text-muted-foreground">No activity data available for this week.</p>
                 </div>
            )}
          </CardContent>
        </Card>

         {/* Add more charts here */}

      </div>
    </div>
  );
};

export default VisualizationsPage;
