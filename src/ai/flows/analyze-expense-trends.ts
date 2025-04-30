'use server';

/**
 * @fileOverview Analyzes expense data to identify spending trends and patterns.
 *
 * - analyzeExpenseTrends - A function that analyzes expense data and provides insights.
 * - AnalyzeExpenseTrendsInput - The input type for the analyzeExpenseTrends function.
 * - AnalyzeExpenseTrendsOutput - The return type for the analyzeExpenseTrends function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
// import { getExpenses } from '@/services/expense'; // Fetch directly now
import { differenceInDays, parseISO, isWithinInterval } from 'date-fns';

// Define Expense structure consistent with localStorage data
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date; // Use Date object internally
  category: string;
}

// Function to load expenses from localStorage (runs server-side context)
// IMPORTANT: See warning in other flows about localStorage access.
async function loadExpensesFromStorage(): Promise<Expense[]> {
     console.warn("Attempting localStorage access in analyzeExpenseTrends flow. This is for demonstration and may not work in production.");
    // const storedExpensesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-expenses') : null;
     const storedExpensesRaw = null; // Simulate server environment

    if (storedExpensesRaw) {
        try {
            // Parse directly into Expense with Date objects
            return JSON.parse(storedExpensesRaw).map((e: any) => ({
                ...e,
                date: parseISO(e.date), // Ensure date is Date object
                amount: Number(e.amount) || 0, // Ensure amount is number
            }));
        } catch (e) {
            console.error("Error parsing expenses from storage in AI flow:", e);
            return generateMockExpenses(); // Fallback to mock
        }
    } else {
        console.log("No expenses found in localStorage, using mock data for analysis.");
        return generateMockExpenses(); // Use mock data if none found
    }
}
// Mock Expense Generation (for fallback) - Ensure date-fns imported if used here
import { subDays, startOfMonth } from 'date-fns';
const generateMockExpenses = (): Expense[] => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    return [
        { id: 'exp-mock-1', description: 'Groceries', amount: 75.50, date: subDays(today, 2), category: 'Food' },
        { id: 'exp-mock-3', description: 'Gasoline', amount: 55.00, date: subDays(today, 3), category: 'Transport' },
        { id: 'exp-mock-4', description: 'Movie Tickets', amount: 30.00, date: subDays(today, 5), category: 'Entertainment' },
        { id: 'exp-mock-6', description: 'New Shirt', amount: 45.99, date: subDays(today, 7), category: 'Shopping' },
        { id: 'exp-mock-8', description: 'Lunch Out', amount: 18.20, date: subDays(today, 4), category: 'Food' },
        { id: 'exp-mock-10', description: 'Streaming Subscription', amount: 15.99, date: subDays(today, 12), category: 'Entertainment' },
         { id: 'exp-mock-13', description: 'Dinner', amount: 60.00, date: subDays(today, 9), category: 'Food' },
          { id: 'exp-mock-14', description: 'Train Ticket', amount: 25.00, date: subDays(today, 15), category: 'Transport' },
    ];
};


const AnalyzeExpenseTrendsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing expense trends.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing expense trends.'),
});
export type AnalyzeExpenseTrendsInput = z.infer<
  typeof AnalyzeExpenseTrendsInputSchema
>;

const TopSpendingCategorySchema = z.object({
      category: z.string().describe('The expense category.'),
      amount: z.number().describe('The total amount spent in this category.'),
      percentage: z.number().describe('The percentage of total spending for this category.'),
});

const AnalyzeExpenseTrendsOutputSchema = z.object({
  totalSpending: z.number().describe('The total amount spent within the specified date range.'),
  averageDailySpending: z.number().describe('The average amount spent per day within the specified date range.'),
  topSpendingCategories: z.array(TopSpendingCategorySchema).describe('A list of the top 3-5 spending categories, sorted by amount descending.'),
  spendingSummary: z.string().describe('A brief textual summary (1-2 sentences) of the spending patterns observed during the period.'),
});
export type AnalyzeExpenseTrendsOutput = z.infer<
  typeof AnalyzeExpenseTrendsOutputSchema
>;

export async function analyzeExpenseTrends(
  input: AnalyzeExpenseTrendsInput
): Promise<AnalyzeExpenseTrendsOutput> {
  return analyzeExpenseTrendsFlow(input);
}

// Define prompt input schema matching the data we will pass
const PromptInputSchema = z.object({
    startDate: z.string().datetime().describe('Start date in ISO 8601 format.'),
    endDate: z.string().datetime().describe('End date in ISO 8601 format.'),
    // Provide calculated data directly to the prompt for summary generation
    totalSpending: z.number(),
    averageDailySpending: z.number(),
    topSpendingCategoriesJson: z.string().describe("JSON string of the top spending categories: [{category, amount, percentage}]"),
    numberOfDays: z.number(),
});

const analyzeExpenseTrendsPrompt = ai.definePrompt({
  name: 'analyzeExpenseTrendsPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
     // AI only needs to return the summary based on calculated data
    schema: z.object({
        spendingSummary: z.string().describe('A brief textual summary (1-2 sentences) of the spending patterns observed during the period, based on the provided figures.'),
    }),
  },
   prompt: `Analyze the user's spending patterns for the period {{startDate}} to {{endDate}} ({{numberOfDays}} days).

Calculated Data (provided for context, do not recalculate):
- Total Spending: $ {{totalSpending}}
- Average Daily Spending: $ {{averageDailySpending}}
- Top Spending Categories (JSON): {{{topSpendingCategoriesJson}}}

Based *only* on the calculated figures above, provide a brief textual summary (1-2 sentences) of the spending patterns. Highlight the total spending and mention the top category or any notable observations from the data provided.
`,
});


const analyzeExpenseTrendsFlow = ai.defineFlow<
  typeof AnalyzeExpenseTrendsInputSchema,
  typeof AnalyzeExpenseTrendsOutputSchema
>(
  {
    name: 'analyzeExpenseTrendsFlow',
    inputSchema: AnalyzeExpenseTrendsInputSchema,
    outputSchema: AnalyzeExpenseTrendsOutputSchema,
  },
  async (input) => {
    // Parse input date strings into Date objects
    const startDate = parseISO(input.startDate);
    const endDate = parseISO(input.endDate);

    // Fetch all expenses
    const allExpenses = await loadExpensesFromStorage();

    // Filter expenses within the date range
    const filteredExpenses = allExpenses.filter(expense => {
       // Expense date is already a Date object
       return isWithinInterval(expense.date, { start: startDate, end: endDate });
     });

     // Perform calculations directly
     const numberOfDays = differenceInDays(endDate, startDate) + 1;
     const validNumberOfDays = numberOfDays > 0 ? numberOfDays : 1;

     const totalSpending = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
     const averageDailySpending = parseFloat((totalSpending / validNumberOfDays).toFixed(2));

     const spendingByCategory = filteredExpenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
     }, {} as Record<string, number>);

     const topSpendingCategories = Object.entries(spendingByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Get top 5
        .map(([category, amount]) => ({
            category,
            amount: parseFloat(amount.toFixed(2)),
            percentage: totalSpending > 0 ? parseFloat(((amount / totalSpending) * 100).toFixed(1)) : 0,
        }));

     // Handle case with no expenses found
     if (filteredExpenses.length === 0) {
         return {
             totalSpending: 0,
             averageDailySpending: 0,
             topSpendingCategories: [],
             spendingSummary: "No expenses recorded for this period.",
         };
     }


    // Call the AI prompt with calculated data for summary generation
    // Pass original string dates to the prompt
    const promptInput: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate,
      endDate: input.endDate,
      totalSpending: parseFloat(totalSpending.toFixed(2)),
      averageDailySpending: averageDailySpending,
      topSpendingCategoriesJson: JSON.stringify(topSpendingCategories),
      numberOfDays: validNumberOfDays,
    };

     let summary = "Summary could not be generated."; // Default summary
     try {
        const { output } = await analyzeExpenseTrendsPrompt(promptInput);
         if (output?.spendingSummary) {
            summary = output.spendingSummary;
        } else {
             console.warn("AnalyzeExpenseTrendsPrompt did not return a summary.");
        }
     } catch (error) {
         console.error("Error calling analyzeExpenseTrendsPrompt:", error);
         summary = "Error generating expense trend summary.";
     }


    // Construct the final output object
    return {
      totalSpending: parseFloat(totalSpending.toFixed(2)),
      averageDailySpending: averageDailySpending,
      topSpendingCategories: topSpendingCategories,
      spendingSummary: summary,
    };
  }
);
