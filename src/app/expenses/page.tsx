
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns'; 
import { Calendar as CalendarIcon, Edit, Plus, Trash2, DollarSign } from 'lucide-react'; 
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts'; 

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/services/expense'; 
import { getExpenses, addUserExpense, updateUserExpense, deleteUserExpense } from '@/services/expense'; 
// useDataMode is no longer needed for checking mock mode here
// import { useDataMode } from '@/context/data-mode-context'; 
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; 
import { Skeleton } from '@/components/ui/skeleton'; 

const expenseSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  date: z.date({
    required_error: 'A date is required.',
  }),
  category: z.string().min(1, 'Category is required.'),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const expenseCategories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Housing', 'Shopping', 'Health', 'Other'];

const ExpenseForm: FC<{
    onClose: () => void;
    initialData?: Expense | null;
    onSave: (expense: Expense) => void;
}> = ({ onClose, initialData, onSave }) => {
    const { toast } = useToast();
    const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

    useEffect(() => {
      if (!initialData) {
        setDefaultDate(new Date());
      }
    }, [initialData]);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: initialData ? {
            description: initialData.description,
            amount: initialData.amount,
            date: initialData.date,
            category: initialData.category,
        } : {
            description: '',
            amount: 0,
            date: undefined, 
            category: '',
        },
    });
    
    useEffect(() => {
        if (!form.getValues('date') && !initialData && defaultDate) {
            form.setValue('date', defaultDate, { shouldValidate: true });
        }
    }, [form, initialData, defaultDate]);


    const onSubmit = (data: ExpenseFormValues) => {
        const expenseData: Omit<Expense, 'id'> = data;

        try {
            let savedExpense: Expense | undefined;
            if (initialData?.id) {
                savedExpense = updateUserExpense({ ...expenseData, id: initialData.id });
                if (savedExpense) {
                    toast({ title: "Expense Updated", description: `Expense "${data.description}" updated.` });
                } else {
                    throw new Error("Failed to find expense to update.");
                }
            } else {
                savedExpense = addUserExpense(expenseData);
                toast({ title: "Expense Added", description: `Expense "${data.description}" added.` });
            }
            if (savedExpense) {
                onSave(savedExpense);
            }
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Error", description: "Could not save expense.", variant: "destructive"});
        } finally {
            onClose();
        }
    };

     return (
         <Form {...form}>
             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel htmlFor="expense-description">Description</FormLabel> <FormControl> <Input id="expense-description" placeholder="e.g., Groceries, Lunch" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                 <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel htmlFor="expense-amount">Amount</FormLabel> <FormControl> <Input id="expense-amount" type="number" step="0.01" placeholder="0.00" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                 <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel htmlFor="expense-date-trigger">Date</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button id="expense-date-trigger" variant={'outline'} className={cn( 'w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground' )} aria-label="Select expense date"> {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                 <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel htmlFor="expense-category-trigger">Category</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger id="expense-category-trigger" aria-label="Select expense category"> <SelectValue placeholder="Select a category" /> </SelectTrigger> </FormControl> <SelectContent> {expenseCategories.map(category => ( <SelectItem key={category} value={category}>{category}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                 <DialogFooter>
                     <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                     <Button type="submit">{initialData ? 'Update Expense' : 'Add Expense'}</Button>
                 </DialogFooter>
             </form>
         </Form>
     );
};


const ExpensesPage: FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  // const { dataMode } = useDataMode(); // No longer needed for mock/user checks here


  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        const loadedExpenses = await getExpenses(); // dataMode parameter removed
        setExpenses(loadedExpenses);
      } catch (error) {
        console.error("Failed to load expenses:", error);
        toast({ title: "Error", description: "Could not load expenses.", variant: "destructive" });
         setExpenses([]); 
      } finally {
        setIsLoading(false);
      }
    };
    loadExpenses();
  }, [toast]); // Removed dataMode from dependencies

  const openDialog = (expense: Expense | null = null) => {
     setEditingExpense(expense);
     setIsDialogOpen(true);
   };

   const closeDialog = () => {
     setIsDialogOpen(false);
     setEditingExpense(null);
   };

    const handleSaveExpense = (savedExpense: Expense) => {
        setExpenses(prev => {
            const existing = prev.find(e => e.id === savedExpense.id);
            let updated: Expense[];
            if (existing) {
                updated = prev.map(e => e.id === savedExpense.id ? savedExpense : e);
            } else {
                updated = [savedExpense, ...prev];
            }
            return updated.sort((a, b) => b.date.getTime() - a.date.getTime());
        });
        closeDialog();
    };

    const handleDeleteExpense = (expenseId: string) => {
         try {
             const success = deleteUserExpense(expenseId);
             if (success) {
                 setExpenses(prev => prev.filter(e => e.id !== expenseId));
                 toast({ title: "Expense Deleted", description: `Expense has been removed.`, variant: "default" });
             } else {
                 throw new Error("Failed to find expense to delete.");
             }
         } catch (error) {
             console.error("Error deleting expense:", error);
             toast({ title: "Error", description: "Could not delete expense.", variant: "destructive"});
         }
     };


   const { totalExpenses, expensesByCategory } = useMemo(() => {
     const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
     const byCategory = expenses.reduce((acc, expense) => {
       acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
       return acc;
     }, {} as Record<string, number>);

     const chartData = Object.entries(byCategory)
       .map(([category, amount]) => ({ category, amount }))
       .sort((a, b) => b.amount - a.amount);

     return { totalExpenses: total, expensesByCategory: chartData };
   }, [expenses]);

    const baseChartConfig: ChartConfig = useMemo(() => ({
        amount: { label: "Amount ($)", color: "hsl(var(--primary))" },
        Food: { label: "Food", color: "hsl(var(--chart-1))" },
        Transport: { label: "Transport", color: "hsl(var(--chart-2))" },
        Entertainment: { label: "Entertainment", color: "hsl(var(--chart-3))" },
        Utilities: { label: "Utilities", color: "hsl(var(--chart-4))" },
        Housing: { label: "Housing", color: "hsl(var(--chart-5))" },
        Shopping: { label: "Shopping", color: "hsl(var(--chart-1))" }, 
        Health: { label: "Health", color: "hsl(var(--chart-2))" },     
        Other: { label: "Other", color: "hsl(var(--chart-3))" },        
    }), []); 

   const chartConfig = useMemo(() => {
        const config: ChartConfig = { ...baseChartConfig };
        expensesByCategory.forEach((item, index) => {
            if (!config[item.category]) {
                config[item.category] = {
                    label: item.category,
                    color: `hsl(var(--chart-${(index % 5) + 1}))` 
                };
            }
        });
        return config;
     }, [expensesByCategory, baseChartConfig]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => openDialog()} aria-label="Add new expense" className="shadow-md">
               <Plus className="mr-2 h-4 w-4" /> Add Expense
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
             </DialogHeader>
                <ExpenseForm
                   onClose={closeDialog}
                   initialData={editingExpense}
                   onSave={handleSaveExpense}
                />
           </DialogContent>
         </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
         <Card className="shadow-lg">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Total Expenses</CardTitle> 
                 <DollarSign className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
                 {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>}
                 <p className="text-xs text-muted-foreground">Across all recorded entries</p>
             </CardContent>
         </Card>
         <Card className="opacity-50 cursor-not-allowed shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">$---.--</div>
                <p className="text-xs text-muted-foreground">Calculation needs history</p>
            </CardContent>
        </Card>
         <Card className="opacity-50 cursor-not-allowed shadow-lg">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                 <DollarSign className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{expensesByCategory[0]?.category || 'N/A'}</div> }
                 <p className="text-xs text-muted-foreground">Highest spending area</p>
             </CardContent>
         </Card>
      </div>


       <Card className="mb-8 shadow-lg">
         <CardHeader>
           <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Visualize your spending distribution.</CardDescription>
         </CardHeader>
         <CardContent className="h-[300px] w-full">
            {isLoading ? (
                 <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
            ) : expensesByCategory.length > 0 ? (
               <ChartContainer config={chartConfig} className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} tickMargin={8} width={80} fontSize={10}/>
                      <RechartsTooltip
                         cursor={false}
                         content={<ChartTooltipContent indicator="dot" nameKey="category" />} />
                     <Bar dataKey="amount" fill="var(--color-amount)" radius={4} barSize={20}>
                         {expensesByCategory.map((entry) => (
                            <Cell key={`cell-${entry.category}`} fill={`var(--color-${entry.category.replace(/\s+/g, '-')}, hsl(var(--primary)))`} />
                         ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </ChartContainer>
            ) : (
                <p className="text-center text-muted-foreground h-full flex items-center justify-center">No expense data available for chart.</p>
            )}
         </CardContent>
       </Card>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>Review your past transactions.</CardDescription>
        </CardHeader>
        <CardContent>
           <ScrollArea className="h-[400px] w-full overflow-x-auto"> 
             <Table className="min-w-full"> 
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[100px]">Date</TableHead>
                   <TableHead>Description</TableHead>
                   <TableHead className="w-[120px]">Category</TableHead>
                   <TableHead className="w-[100px] text-right">Amount</TableHead>
                   <TableHead className="w-[80px] text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                    [...Array(5)].map((_, i) => ( 
                        <TableRow key={`skel-${i}`}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                        </TableRow>
                     ))
                 ) : expenses.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center">
                        No expenses recorded yet.
                     </TableCell>
                   </TableRow>
                 ) : (
                   expenses.map((expense) => (
                     <TableRow key={expense.id}>
                       <TableCell>{format(expense.date, 'PP')}</TableCell>
                       <TableCell className="font-medium">{expense.description}</TableCell>
                       <TableCell><span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{expense.category}</span></TableCell>
                       <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-1">
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(expense)} aria-label={`Edit expense "${expense.description}"`}>
                                 <Edit className="h-4 w-4" />
                                 <span className="sr-only">Edit</span>
                             </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete expense "${expense.description}"`}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Expense?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the expense: "{expense.description}"?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
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
