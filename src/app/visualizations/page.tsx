'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Line, LineChart } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Loader2, BarChartBig, PieChart as PieIcon, CalendarDays, ListChecksIcon, StickyNote, Wallet } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Mock Data Interfaces (assuming they exist based on other pages)
// TODO: Replace with actual imports and potentially fetch functions if needed
interface DailyLogEntry { id: string; date: Date; activity: string; }
interface Task { id: string; title: string; status: 'Pending' | 'In Progress' | 'Completed'; dueDate?: Date; }
interface CalendarEvent { title: string; start: Date; end: Date; }
interface Expense { id: string; category: string; amount: number; date: Date; }
interface Note { id: string; title: string; createdAt: Date; updatedAt: Date; }

// Mock Fetch Functions (Replace with actual service calls)
async function getDailyLogs(): Promise<DailyLogEntry[]> {
    // Simulate fetching data
    await new Promise(resolve => setTimeout(resolve, 400));
    // Use localStorage or return fixed mock data
    const storedLogs = localStorage.getItem('prodev-daily-logs'); // Assuming logs are stored
    if (storedLogs) return JSON.parse(storedLogs).map((l: any) => ({ ...l, date: parseISO(l.date) }));
    return [
        { id: 'log1', date: new Date(2024, 6, 1), activity: 'Logged activity 1' },
        { id: 'log2', date: new Date(2024, 6, 1), activity: 'Logged activity 2' },
        { id: 'log3', date: new Date(2024, 6, 3), activity: 'Logged activity 3' },
        { id: 'log4', date: new Date(2024, 6, 5), activity: 'Logged activity 4' },
    ];
}
async function getTasks(): Promise<Task[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Use localStorage or return fixed mock data
     const storedTasks = localStorage.getItem('prodev-tasks'); // Assuming tasks are stored
     if (storedTasks) return JSON.parse(storedTasks).map((t: any) => ({ ...t, dueDate: t.dueDate ? parseISO(t.dueDate) : undefined }));
    return [
        { id: 't1', title: 'Task 1', status: 'Completed', dueDate: new Date(2024, 6, 2) },
        { id: 't2', title: 'Task 2', status: 'In Progress' },
        { id: 't3', title: 'Task 3', status: 'Pending', dueDate: new Date(2024, 6, 10) },
        { id: 't4', title: 'Task 4', status: 'Pending' },
        { id: 't5', title: 'Task 5', status: 'Completed', dueDate: new Date(2024, 6, 5) },
    ];
}
async function getCalendarEvents(): Promise<CalendarEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
     // Mock - replace with actual fetching if calendar page stores data
    return [
        { title: 'Meeting A', start: new Date(2024, 6, 1, 10), end: new Date(2024, 6, 1, 11) },
        { title: 'Project Work', start: new Date(2024, 6, 3, 14), end: new Date(2024, 6, 3, 16) },
        { title: 'Meeting B', start: new Date(2024, 6, 3, 10), end: new Date(2024, 6, 3, 11) },
        { title: 'Appointment', start: new Date(2024, 6, 5, 9), end: new Date(2024, 6, 5, 10) },
    ];
}
async function getExpenses(): Promise<Expense[]> {
    await new Promise(resolve => setTimeout(resolve, 700));
    const storedExpenses = localStorage.getItem('prodev-expenses'); // Assuming expenses are stored
    if (storedExpenses) return JSON.parse(storedExpenses).map((e: any) => ({ ...e, date: parseISO(e.date) }));
    return [
        { id: 'e1', category: 'Food', amount: 25.5, date: new Date(2024, 6, 1) },
        { id: 'e2', category: 'Transport', amount: 15, date: new Date(2024, 6, 2) },
        { id: 'e3', category: 'Food', amount: 12, date: new Date(2024, 6, 3) },
        { id: 'e4', category: 'Entertainment', amount: 50, date: new Date(2024, 6, 4) },
        { id: 'e5', category: 'Transport', amount: 18, date: new Date(2024, 6, 5) },
    ];
}
async function getNotes(): Promise<Note[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const storedNotes = localStorage.getItem('prodev-notes'); // Assuming notes are stored
    if (storedNotes) return JSON.parse(storedNotes).map((n: any) => ({ ...n, createdAt: parseISO(n.createdAt), updatedAt: parseISO(n.updatedAt) }));
    return [
        { id: 'n1', title: 'Note 1', createdAt: new Date(2024, 6, 1), updatedAt: new Date(2024, 6, 1) },
        { id: 'n2', title: 'Note 2', createdAt: new Date(2024, 6, 3), updatedAt: new Date(2024, 6, 4) },
        { id: 'n3', title: 'Note 3', createdAt: new Date(2024, 6, 5), updatedAt: new Date(2024, 6, 5) },
    ];
}
// ---- End Mock Functions ----

// --- Chart Configs ---
const taskStatusConfig = {
  tasks: { label: "Tasks" },
  Pending: { label: "Pending", color: "hsl(var(--chart-1))" },
  'In Progress': { label: "In Progress", color: "hsl(var(--chart-2))" },
  Completed: { label: "Completed", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const expensesConfig = {
    amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
    // Add colors for categories if needed for pie chart
    Food: { label: "Food", color: "hsl(var(--chart-1))" },
    Transport: { label: "Transport", color: "hsl(var(--chart-2))" },
    Entertainment: { label: "Entertainment", color: "hsl(var(--chart-3))" },
    Utilities: { label: "Utilities", color: "hsl(var(--chart-4))" },
    Other: { label: "Other", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const activityConfig = {
    count: { label: "Count", color: "hsl(var(--secondary))" },
} satisfies ChartConfig;


const VisualizationsPage: FC = () => {
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [logData, taskData, eventData, expenseData, noteData] = await Promise.all([
          getDailyLogs(),
          getTasks(),
          getCalendarEvents(),
          getExpenses(),
          getNotes(),
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
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  // --- Data Processing for Charts ---
  const taskStatusData = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<Task['status'], number>);
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [tasks]);

   const expensesByCategoryData = useMemo(() => {
     const byCategory = expenses.reduce((acc, expense) => {
       acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
       return acc;
     }, {} as Record<string, number>);
     return Object.entries(byCategory)
       .map(([category, amount]) => ({ category, amount: parseFloat(amount.toFixed(2)) })) // Ensure amount is number
       .sort((a, b) => b.amount - a.amount);
   }, [expenses]);

  const activityFrequencyData = useMemo(() => {
     const today = new Date();
     const start = startOfWeek(today, { weekStartsOn: 1 }); // Start week on Monday
     const end = endOfWeek(today, { weekStartsOn: 1 });
     const weekDays = eachDayOfInterval({ start, end });

     // Initialize counts for each day of the week
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
      calendarEvents.forEach(event => {
          if (isWithinInterval(event.start, { start, end })) {
             const formattedDate = format(event.start, 'MMM d');
             if (counts[formattedDate]) counts[formattedDate].events += 1;
         }
      });
      notes.forEach(note => {
         if (isWithinInterval(note.createdAt, { start, end })) {
             const formattedDate = format(note.createdAt, 'MMM d');
              if (counts[formattedDate]) counts[formattedDate].notes += 1;
         }
      });

     return Object.values(counts);
   }, [dailyLogs, calendarEvents, notes]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> Visualizations
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
            <CardDescription>Overview of task statuses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full flex items-center justify-center">
            {taskStatusData.length > 0 ? (
                <ChartContainer config={taskStatusConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={taskStatusData}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50} // Make it a donut chart
                            fill="var(--color-tasks)"
                            labelLine={false}
                             label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                                );
                             }}
                        >
                         {taskStatusData.map((entry) => (
                             <Cell key={`cell-${entry.status}`} fill={`var(--color-${entry.status.replace(' ', '')})`} />
                          ))}
                         </Pie>
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p className="text-muted-foreground">No task data available.</p>
            )}
          </CardContent>
        </Card>


        {/* Expenses by Category (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChartBig className="h-5 w-5" /> Expenses by Category</CardTitle>
            <CardDescription>Spending distribution across categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full">
            {expensesByCategoryData.length > 0 ? (
              <ChartContainer config={expensesConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="category"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={80}
                        fontSize={10}
                    />
                     <RechartsTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" hideLabel />}
                    />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={4} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground h-full flex items-center justify-center">No expense data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Frequency This Week (Line Chart) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Activity Frequency (This Week)</CardTitle>
            <CardDescription>Logs, Events, and Notes created per day this week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
             {activityFrequencyData.length > 0 ? (
               <ChartContainer config={activityConfig} className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={activityFrequencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="date" fontSize={10} tickMargin={5} axisLine={false} tickLine={false} />
                     <YAxis fontSize={10} tickMargin={5} axisLine={false} tickLine={false} allowDecimals={false} />
                      <ChartTooltip
                         content={<ChartTooltipContent indicator="line" />} />
                        <Legend />
                      <Line type="monotone" dataKey="logs" name="Daily Logs" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="events" name="Calendar Events" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                       <Line type="monotone" dataKey="notes" name="Notes Created" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </ChartContainer>
            ) : (
                <p className="text-center text-muted-foreground h-full flex items-center justify-center">No activity data available for this week.</p>
            )}
          </CardContent>
        </Card>

         {/* Add more charts here as needed */}
         {/* Example: Histogram for expense amounts */}
         {/* Example: Line chart for tasks completed over time */}

      </div>
    </div>
  );
};

export default VisualizationsPage;
