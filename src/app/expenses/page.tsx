'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Edit, Plus, Trash2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';


import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/services/expense'; // Import Expense type
// import { getExpenses as fetchExpenses } from '@/services/expense'; // Import service function - We'll use localStorage now
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Local storage key
const LOCAL_STORAGE_KEY = 'prodev-expenses';


const expenseSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'), // Use coerce for string input
  date: z.date({
    required_error: 'A date is required.',
  }),
  category: z.string().min(1, 'Category is required.'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Sample categories - consider making this dynamic or configurable
const expenseCategories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Housing', 'Shopping', 'Health', 'Other'];

// Function to load expenses from localStorage
const loadExpensesFromLocalStorage = (): Expense[] => {
   if (typeof window === 'undefined') return [];
   const storedExpenses = localStorage.getItem(LOCAL_STORAGE_KEY);
   if (storedExpenses) {
       try {
           // Parse and ensure dates are Date objects
           return JSON.parse(storedExpenses).map((expense: any) => ({
               ...expense,
               date: parseISO(expense.date), // Convert string back to Date
           }));
       } catch (e) {
           console.error("Error parsing expenses from localStorage:", e);
           return [];
       }
   }
   return [];
};

// Function to save expenses to localStorage
const saveExpensesToLocalStorage = (expenses: Expense[]) => {
    if (typeof window === 'undefined') return;
   try {
       // Store dates as ISO strings for JSON compatibility
       const expensesToStore = expenses.map(expense => ({
           ...expense,
           date: expense.date.toISOString(),
       }));
       localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expensesToStore));
   } catch (e) {
       console.error("Error saving expenses to localStorage:", e);
   }
};


const ExpensesPage: FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Not really loading from API anymore
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      category: '',
    },
  });

    // Load expenses on initial render
    useEffect(() => {
        setExpenses(loadExpensesFromLocalStorage());
    }, []);

  const openDialog = (expense: Expense | null = null) => {
     setEditingExpense(expense);
     if (expense) {
       form.reset({
         description: expense.description,
         amount: expense.amount,
         date: expense.date, // Already Date object from loading
         category: expense.category,
       });
     } else {
       form.reset({
         description: '',
         amount: 0,
         date: new Date(),
         category: '',
       });
     }
     setIsDialogOpen(true);
   };

   const closeDialog = () => {
     setIsDialogOpen(false);
     setEditingExpense(null);
     form.reset();
   };

  const onSubmit = (data: ExpenseFormValues) => {
    let updatedExpenses: Expense[];
    if (editingExpense) {
      // Update existing expense
      const updatedExpense: Expense = { ...editingExpense, ...data };
       updatedExpenses = expenses.map((e) => (e.id === editingExpense.id ? updatedExpense : e));
      toast({ title: "Expense Updated", description: `Expense "${data.description}" has been updated.` });
      // TODO: Call API to update expense (if applicable)
       console.log('Updated Expense:', updatedExpense);
    } else {
      // Add new expense
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        ...data,
      };
       updatedExpenses = [...expenses, newExpense];
       toast({ title: "Expense Added", description: `Expense "${data.description}" has been added.` });
      // TODO: Call API to add expense (if applicable)
       console.log('New Expense:', newExpense);
    }
     // Sort, set state, and save
      updatedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime()); // Re-sort
      setExpenses(updatedExpenses);
      saveExpensesToLocalStorage(updatedExpenses);

     closeDialog();
  };

  const deleteExpense = (expenseId: string) => {
    const expenseToDelete = expenses.find(e => e.id === expenseId);
    const updatedExpenses = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updatedExpenses);
    saveExpensesToLocalStorage(updatedExpenses); // Save changes
    toast({ title: "Expense Deleted", description: `Expense "${expenseToDelete?.description}" has been deleted.`, variant: "destructive" });
    // TODO: Call API to delete expense (if applicable)
    console.log('Deleted Expense ID:', expenseId);
  };

   // Calculate totals and prepare chart data
   const { totalExpenses, expensesByCategory } = useMemo(() => {
     const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
     const byCategory = expenses.reduce((acc, expense) => {
       acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
       return acc;
     }, {} as Record<string, number>);

     const chartData = Object.entries(byCategory)
       .map(([category, amount]) => ({ category, amount }))
       .sort((a, b) => b.amount - a.amount); // Sort for chart display

     return { totalExpenses: total, expensesByCategory: chartData };
   }, [expenses]);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {
            amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
        };
         // Dynamically add categories from data to the config for the pie chart tooltip/legend
        expensesByCategory.forEach((item, index) => {
            if (!config[item.category]) {
                // Cycle through chart colors or use a generator
                config[item.category] = {
                    label: item.category,
                    color: `hsl(var(--chart-${(index % 5) + 1}))` // Use chart-1 to chart-5
                };
            }
        });
        return config;
     }, [expensesByCategory]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => openDialog()}>
               <Plus className="mr-2 h-4 w-4" /> Add Expense
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
             </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                       control={form.control}
                       name="description"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Description</FormLabel>
                           <FormControl>
                             <Input placeholder="e.g., Groceries, Lunch" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                      <FormField
                         control={form.control}
                         name="amount"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Amount</FormLabel>
                             <FormControl>
                               <Input type="number" step="0.01" placeholder="0.00" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     <FormField
                         control={form.control}
                         name="date"
                         render={({ field }) => (
                           <FormItem className="flex flex-col">
                             <FormLabel>Date</FormLabel>
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
                                   disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
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
                         name="category"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Category</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}> {/* Controlled */}
                               <FormControl>
                                 <SelectTrigger>
                                   <SelectValue placeholder="Select a category" />
                                 </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                                 {expenseCategories.map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     <div className="flex justify-end gap-2 pt-4">
                         <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                         <Button type="submit">{editingExpense ? 'Update Expense' : 'Add Expense'}</Button>
                     </div>
                  </form>
                </Form>
           </DialogContent>
         </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
         <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Total Expenses</CardTitle> {/* Simplified Title */}
                 <DollarSign className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
                 <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
                 {/* Optional: Add trend comparison if historical data is available */}
                 {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
             </CardContent>
         </Card>
          {/* Add more summary cards if needed (e.g., Average Daily Spend) */}
      </div>


       {/* Expense Chart */}
       <Card className="mb-8 shadow-md">
         <CardHeader>
           <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Visualize your spending distribution.</CardDescription>
         </CardHeader>
         <CardContent className="h-[300px] w-full">
            {expensesByCategory.length > 0 ? (
               <ChartContainer config={chartConfig} className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={expensesByCategory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                     <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                     <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} width={40}/>
                      <RechartsTooltip
                         cursor={false}
                         content={<ChartTooltipContent indicator="dot" />} />
                     <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                   </BarChart>
                 </ResponsiveContainer>
               </ChartContainer>
            ) : (
                <p className="text-center text-muted-foreground h-full flex items-center justify-center">No expense data available for chart.</p>
            )}
         </CardContent>
       </Card>


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>Review your past transactions.</CardDescription>
        </CardHeader>
        <CardContent>
           <ScrollArea className="h-[400px] w-full">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Description</TableHead>
                   <TableHead>Category</TableHead>
                   <TableHead className="text-right">Amount</TableHead>
                   <TableHead className="w-[80px] text-right">Actions</TableHead> {/* Align right */}
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center">Loading expenses...</TableCell>
                   </TableRow>
                 ) : expenses.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center">No expenses recorded yet.</TableCell>
                   </TableRow>
                 ) : (
                   expenses.map((expense) => (
                     <TableRow key={expense.id}>
                       <TableCell>{format(expense.date, 'PP')}</TableCell> {/* Already Date */}
                       <TableCell className="font-medium">{expense.description}</TableCell>
                       <TableCell><span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{expense.category}</span></TableCell>
                       <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                       <TableCell className="text-right"> {/* Align right */}
                         <div className="flex items-center justify-end gap-1">
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(expense)}>
                                 <Edit className="h-4 w-4" />
                                 <span className="sr-only">Edit</span>
                             </Button>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteExpense(expense.id)}>
                                 <Trash2 className="h-4 w-4" />
                                 <span className="sr-only">Delete</span>
                             </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </ScrollArea>
         </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
