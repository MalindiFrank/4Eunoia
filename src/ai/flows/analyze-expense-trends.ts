
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
import type { Expense } from '@/services/expense'; // Use type from service

// Schema for expenses passed into the flow (matches service type structure)
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
  spendingSummary: z.string().describe('A brief textual summary (2-3 sentences) of the spending patterns observed during the period, including potential insights or areas for review.'),
  // Added field for potential savings suggestions
  savingsSuggestions: z.array(z.string()).optional().describe('List of 1-2 actionable suggestions for potential savings based on spending patterns.'),
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
    // Include raw expense list (summarized) for deeper insights
    expenseListSummaryJson: z.string().describe("JSON string summarizing key expenses for context (e.g., [{description, amount, category}]). Limit to ~10-15 largest or most frequent."),
});

const analyzeExpenseTrendsPrompt = ai.definePrompt({
  name: 'analyzeExpenseTrendsPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
     // AI generates summary and suggestions
    schema: z.object({
        spendingSummary: z.string().describe('A brief textual summary (2-3 sentences) of the spending patterns observed during the period, incorporating calculated figures and potentially highlighting unusual items or high-spending areas.'),
        savingsSuggestions: z.array(z.string()).optional().describe('Provide 1-2 concrete, actionable savings suggestions based on the top categories or specific large expenses noted in the summary list (e.g., "Review subscription costs," "Consider packing lunch more often"). Omit if no clear opportunities.'),
    }),
  },
   prompt: `Analyze the user's spending patterns for the period {{startDate}} to {{endDate}} ({{numberOfDays}} days).

Calculated Data:
- Total Spending: $ {{totalSpending}}
- Average Daily Spending: $ {{averageDailySpending}}
- Top Spending Categories (JSON): {{{topSpendingCategoriesJson}}}

Expense List Summary (for context on specific items, JSON):
{{{expenseListSummaryJson}}}


Based on the calculated figures and the expense list summary:
1.  Provide a **Spending Summary** (2-3 sentences). Go beyond just stating the numbers. Mention the top category, comment on the daily average (is it high/low?), and point out any potentially noteworthy items or trends from the list (e.g., "Spending is dominated by [Top Category]. Several large purchases in [Another Category] also contributed significantly.").
2.  Generate 1-2 actionable **Savings Suggestions** if obvious opportunities exist based on the top categories or specific large/recurring expenses. Examples: "Review your 'Entertainment' subscriptions for potential cuts," "Consider comparing prices for 'Groceries' at different stores." If no clear suggestions, omit this field or provide an empty array.

Generate the output in the specified JSON format.
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
    const allExpenses: Expense[] = input.expenses.map(e => ({
        ...e,
        date: parseISO(e.date), // Parse date string to Date object
    }));

    // Filter expenses within the date range
    const filteredExpenses = allExpenses.filter(expense => {
       return isWithinInterval(expense.date, { start: startDate, end: endDate });
     });

     // --- Calculations ---
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
             savingsSuggestions: [],
         };
     }

     // Prepare summarized list for prompt context (e.g., top 10 expenses by amount)
     const expenseListSummary = filteredExpenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10) // Limit context size
        .map(e => ({ description: e.description, amount: e.amount, category: e.category }));

    // --- Call AI ---
    const promptInputData: z.infer<typeof PromptInputSchema> = {
      startDate: input.startDate, // Pass original ISO strings
      endDate: input.endDate,
      totalSpending: parseFloat(totalSpending.toFixed(2)),
      averageDailySpending: averageDailySpending,
      topSpendingCategoriesJson: JSON.stringify(topSpendingCategories),
      numberOfDays: validNumberOfDays,
      expenseListSummaryJson: JSON.stringify(expenseListSummary),
    };

     let summary = "Summary could not be generated."; // Default summary
     let suggestions: string[] | undefined = []; // Default suggestions

     try {
        const { output } = await analyzeExpenseTrendsPrompt(promptInputData);
         if (output) {
            summary = output.spendingSummary || `Total spending: $${totalSpending.toFixed(2)}. Avg daily: $${averageDailySpending.toFixed(2)}. Top category: ${topSpendingCategories[0]?.category || 'N/A'}.`;
            suggestions = output.savingsSuggestions; // Use AI suggestions if provided
        } else {
             console.warn("AnalyzeExpenseTrendsPrompt did not return output.");
             summary = `Total spending: $${totalSpending.toFixed(2)}. Avg daily: $${averageDailySpending.toFixed(2)}. Top category: ${topSpendingCategories[0]?.category || 'N/A'}.`;
             // Basic fallback suggestion
             if (topSpendingCategories.length > 0) {
                 suggestions = [`Review spending in the '${topSpendingCategories[0].category}' category.`];
             }
        }
     } catch (error) {
         console.error("Error calling analyzeExpenseTrendsPrompt:", error);
         summary = `Error generating summary. ($${totalSpending.toFixed(2)} total, $${averageDailySpending.toFixed(2)} avg daily).`;
     }


    // --- Construct Final Output ---
    return {
      totalSpending: parseFloat(totalSpending.toFixed(2)),
      averageDailySpending: averageDailySpending,
      topSpendingCategories: topSpendingCategories,
      spendingSummary: summary,
      savingsSuggestions: suggestions,
    };
  }
);
