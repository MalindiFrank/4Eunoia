
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Line, LineChart } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, addDays, subDays } from 'date-fns'; // Import addDays and subDays
import { Loader2, BarChartBig, PieChart as PieIcon, CalendarDays, ListChecksIcon, StickyNote, Wallet } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Data Interfaces (assuming they exist based on other pages)
interface DailyLogEntry { id: string; date: Date; activity: string; }
interface Task { id: string; title: string; status: 'Pending' | 'In Progress' | 'Completed'; dueDate?: Date; createdAt?: Date; } // Added createdAt for better filtering
interface CalendarEvent { title: string; start: Date; end: Date; description?: string;}
interface Expense { id: string; category: string; amount: number; date: Date; }
interface Note { id: string; title: string; createdAt: Date; updatedAt: Date; }

// Fetch Functions using LocalStorage (consistent with other pages)
async function getDailyLogs(): Promise<DailyLogEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    if (typeof window === 'undefined') return [];
    const storedLogs = localStorage.getItem('prodev-daily-logs');
    if (storedLogs) {
        try {
            return JSON.parse(storedLogs).map((l: any) => ({ ...l, date: parseISO(l.date) }));
        } catch (e) { console.error("Error parsing daily logs:", e); return []; }
    }
    return []; // Return empty if nothing in localStorage
}
async function getTasks(): Promise<Task[]> {
     await new Promise(resolve => setTimeout(resolve, 150));
    if (typeof window === 'undefined') return [];
     const storedTasks = localStorage.getItem('prodev-tasks');
     if (storedTasks) {
         try {
             return JSON.parse(storedTasks).map((t: any) => ({
                 ...t,
                 dueDate: t.dueDate ? parseISO(t.dueDate) : undefined,
                 // Assuming createdAt might be added later; for now, use a default or handle absence
                 createdAt: t.createdAt ? parseISO(t.createdAt) : undefined
            }));
         } catch (e) { console.error("Error parsing tasks:", e); return []; }
     }
     return [];
}
async function getCalendarEvents(rangeStart?: Date, rangeEnd?: Date): Promise<CalendarEvent[]> {
    // NOTE: Calendar events are not currently stored in localStorage in the provided code.
    // Returning mock data for now. Implement localStorage saving/loading in calendar page if needed.
    await new Promise(resolve => setTimeout(resolve, 200));
     console.warn("Calendar events not stored; returning mock data for visualization.");
     const today = new Date();
     const mockEvents = [
        { title: 'Daily Standup', start: new Date(new Date(today).setHours(9, 0, 0, 0)), end: new Date(new Date(today).setHours(9, 15, 0, 0)) },
        { title: 'Project Work', start: new Date(new Date(today).setHours(14, 0, 0, 0)), end: new Date(new Date(today).setHours(16, 0, 0, 0)) },
        { title: 'Client Meeting', start: new Date(addDays(today, 2).setHours(11, 0, 0, 0)), end: new Date(addDays(today, 2).setHours(12, 0, 0, 0)) }, // Use imported addDays
        { title: 'Past Event', start: new Date(subDays(today, 3).setHours(10, 0, 0, 0)), end: new Date(subDays(today, 3).setHours(11, 0, 0, 0)) }, // Use imported subDays
     ];
     // Filter if range is provided
     if (rangeStart && rangeEnd) {
         return mockEvents.filter(event =>
             (event.start >= rangeStart && event.start <= rangeEnd) ||
             (event.end >= rangeStart && event.end <= rangeEnd) ||
             (event.start < rangeStart && event.end > rangeEnd)
         );
     }
    return mockEvents;
}
async function getExpenses(): Promise<Expense[]> {
     await new Promise(resolve => setTimeout(resolve, 120));
    if (typeof window === 'undefined') return [];
    const storedExpenses = localStorage.getItem('prodev-expenses');
    if (storedExpenses) {
         try {
            return JSON.parse(storedExpenses).map((e: any) => ({ ...e, date: parseISO(e.date), amount: Number(e.amount) || 0 }));
         } catch (e) { console.error("Error parsing expenses:", e); return []; }
    }
    return [];
}
async function getNotes(): Promise<Note[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    if (typeof window === 'undefined') return [];
    const storedNotes = localStorage.getItem('prodev-notes');
    if (storedNotes) {
         try {
            return JSON.parse(storedNotes).map((n: any) => ({ ...n, createdAt: parseISO(n.createdAt), updatedAt: parseISO(n.updatedAt) }));
         } catch (e) { console.error("Error parsing notes:", e); return []; }
    }
    return [];
}
// ---- End Fetch Functions ----

// --- Chart Configs ---
const taskStatusConfig = {
  tasks: { label: "Tasks" },
  Pending: { label: "Pending", color: "hsl(var(--chart-2))" }, // Adjusted colors for better distinction
  'In Progress': { label: "In Progress", color: "hsl(var(--chart-4))" },
  Completed: { label: "Completed", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const expensesConfig = {
    amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
    // Define colors for categories dynamically later if needed or use defaults
    Food: { label: "Food", color: "hsl(var(--chart-1))" },
    Transport: { label: "Transport", color: "hsl(var(--chart-2))" },
    Entertainment: { label: "Entertainment", color: "hsl(var(--chart-3))" },
    Utilities: { label: "Utilities", color: "hsl(var(--chart-4))" },
    Housing: { label: "Housing", color: "hsl(var(--chart-5))" },
    Shopping: { label: "Shopping", color: "hsl(var(--chart-1))" }, // Reuse colors
    Health: { label: "Health", color: "hsl(var(--chart-2))" },
    Other: { label: "Other", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const activityConfig = {
    logs: { label: "Logs", color: "hsl(var(--chart-1))" },
    events: { label: "Events", color: "hsl(var(--chart-2))" },
    notes: { label: "Notes", color: "hsl(var(--chart-3))" },
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
          const today = new Date();
          const start = startOfWeek(today, { weekStartsOn: 1 });
          const end = endOfWeek(today, { weekStartsOn: 1 });

        const [logData, taskData, eventData, expenseData, noteData] = await Promise.all([
          getDailyLogs(),
          getTasks(),
          getCalendarEvents(start, end), // Fetch for the current week for the activity chart
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
    // Ensure all statuses are present, even if count is 0
    const statuses: Task['status'][] = ['Pending', 'In Progress', 'Completed'];
    return statuses.map(status => ({ status, count: counts[status] || 0 }));
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
      // Use the events fetched specifically for this week's range
      calendarEvents.forEach(event => {
         const formattedDate = format(event.start, 'MMM d'); // Assuming events are single-day for this chart
         if (counts[formattedDate]) counts[formattedDate].events += 1;
      });
      notes.forEach(note => {
         if (isWithinInterval(note.createdAt, { start, end })) {
             const formattedDate = format(note.createdAt, 'MMM d');
              if (counts[formattedDate]) counts[formattedDate].notes += 1;
         }
      });

     return Object.values(counts);
   }, [dailyLogs, calendarEvents, notes]); // calendarEvents dependency added

   // Dynamic Expenses Chart Config
   const dynamicExpensesConfig = useMemo(() => {
        const config: ChartConfig = {
            amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
        };
        expensesByCategoryData.forEach((item, index) => {
            if (!config[item.category]) {
                 // Find existing color or assign new one
                const predefinedColor = expensesConfig[item.category as keyof typeof expensesConfig]?.color;
                config[item.category] = {
                    label: item.category,
                    color: predefinedColor || `hsl(var(--chart-${(index % 5) + 1}))` // Fallback cycle
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
            <CardDescription>Overview of task statuses (All Time).</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full flex items-center justify-center">
            {tasks.length > 0 ? (
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
                            fill="var(--color-tasks)" // Base color, overridden by Cell
                             labelLine={false}
                             label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
                                if (percent === 0) return null; // Don't show label for 0%
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10" fontWeight="medium">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                                );
                             }}
                        >
                         {taskStatusData.map((entry) => (
                             // Use status name (without spaces) for CSS variable lookup
                             <Cell key={`cell-${entry.status}`} fill={`var(--color-${entry.status.replace(/\s+/g, '')}, hsl(var(--muted)))`} /> // Fallback color
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
            <CardDescription>Spending distribution across categories (All Time).</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] w-full">
            {expensesByCategoryData.length > 0 ? (
              <ChartContainer config={dynamicExpensesConfig} className="h-full w-full">
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
                         content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                            // props.payload contains the original data item ({ category, amount })
                            const categoryLabel = dynamicExpensesConfig[props.payload.category]?.label ?? props.payload.category;
                            return (
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                                    <span className="font-bold">${(value as number).toFixed(2)}</span>
                                </div>
                            );
                         }} />}
                    />
                     <Bar dataKey="amount" layout="vertical" radius={4} barSize={20}>
                        {expensesByCategoryData.map((entry) => (
                            <Cell key={`cell-${entry.category}`} fill={`var(--color-${entry.category}, hsl(var(--primary)))`} /> // Fallback to primary
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
            <CardDescription>Logs, Events, and Notes created per day this week (Mon-Sun).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
             {activityFrequencyData.some(d => d.logs > 0 || d.events > 0 || d.notes > 0) ? ( // Check if any data exists
               <ChartContainer config={activityConfig} className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={activityFrequencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="date" fontSize={10} tickMargin={5} axisLine={false} tickLine={false} />
                     <YAxis fontSize={10} tickMargin={5} axisLine={false} tickLine={false} allowDecimals={false} />
                      <ChartTooltip
                         content={<ChartTooltipContent indicator="line" />} />
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

         {/* Add more charts here as needed */}
         {/* Example: Histogram for expense amounts */}
         {/* Example: Line chart for tasks completed over time */}

      </div>
    </div>
  );
};

export default VisualizationsPage;


