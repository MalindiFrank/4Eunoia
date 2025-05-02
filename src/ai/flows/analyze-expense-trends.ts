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
import { differenceInDays, parseISO, isWithinInterval, formatISO } from 'date-fns';

// Define Expense structure consistent with what the component will pass
interface InputExpense {
  id: string;
  description: string;
  amount: number;
  date: Date; // Expect Date object from component
  category: string;
}

// Schema for expenses passed into the flow
const InputExpenseSchema = z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number(),
    date: z.string().datetime(), // Expect ISO string for validation
    category: z.string(),
});


const AnalyzeExpenseTrendsInputSchema = z.object({
  startDate: z.string().datetime().describe('The start date (ISO 8601 format) for analyzing expense trends.'),
  endDate: z.string().datetime().describe('The end date (ISO 8601 format) for analyzing expense trends.'),
  // Add expenses as input
  expenses: z.array(InputExpenseSchema).describe('An array of expense objects relevant to the user.'),
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

    // Use expenses passed in the input
    const allExpenses: InputExpense[] = input.expenses.map(e => ({
        ...e,
        date: parseISO(e.date), // Parse date string to Date object
    }));

    // Filter expenses within the date range
    const filteredExpenses = allExpenses.filter(expense => {
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
    const promptInputData: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate, // Pass original ISO strings
      endDate: input.endDate,
      totalSpending: parseFloat(totalSpending.toFixed(2)),
      averageDailySpending: averageDailySpending,
      topSpendingCategoriesJson: JSON.stringify(topSpendingCategories),
      numberOfDays: validNumberOfDays,
    };

     let summary = "Summary could not be generated."; // Default summary
     try {
        const { output } = await analyzeExpenseTrendsPrompt(promptInputData);
         if (output?.spendingSummary) {
            summary = output.spendingSummary;
        } else {
             console.warn("AnalyzeExpenseTrendsPrompt did not return a summary.");
             summary = `Total spending: $${totalSpending.toFixed(2)}. Avg daily: $${averageDailySpending.toFixed(2)}. Top category: ${topSpendingCategories[0]?.category || 'N/A'}.`;
        }
     } catch (error) {
         console.error("Error calling analyzeExpenseTrendsPrompt:", error);
         summary = `Error generating summary. ($${totalSpending.toFixed(2)} total, $${averageDailySpending.toFixed(2)} avg daily).`;
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

    