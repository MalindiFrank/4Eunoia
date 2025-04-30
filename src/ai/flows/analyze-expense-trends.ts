// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
import { getExpenses } from '@/services/expense';
import { differenceInDays } from 'date-fns';

const AnalyzeExpenseTrendsInputSchema = z.object({
  startDate: z.date().describe('The start date for analyzing expense trends.'),
  endDate: z.date().describe('The end date for analyzing expense trends.'),
});
export type AnalyzeExpenseTrendsInput = z.infer<
  typeof AnalyzeExpenseTrendsInputSchema
>;

const AnalyzeExpenseTrendsOutputSchema = z.object({
  totalSpending: z.number().describe('The total amount spent within the specified date range.'),
  averageDailySpending: z.number().describe('The average amount spent per day within the specified date range.'),
  topSpendingCategories: z.array(
    z.object({
      category: z.string().describe('The expense category.'),
      amount: z.number().describe('The total amount spent in this category.'),
      percentage: z.number().describe('The percentage of total spending for this category.'),
    })
  ).describe('A list of the top spending categories, sorted by amount descending.'),
  spendingSummary: z.string().describe('A brief textual summary of the spending patterns observed.'),
});
export type AnalyzeExpenseTrendsOutput = z.infer<
  typeof AnalyzeExpenseTrendsOutputSchema
>;

export async function analyzeExpenseTrends(
  input: AnalyzeExpenseTrendsInput
): Promise<AnalyzeExpenseTrendsOutput> {
  return analyzeExpenseTrendsFlow(input);
}

const analyzeExpenseTrendsPrompt = ai.definePrompt({
  name: 'analyzeExpenseTrendsPrompt',
  input: {
    schema: z.object({
      startDate: z.date().describe('The start date for analyzing expense trends.'),
      endDate: z.date().describe('The end date for analyzing expense trends.'),
      expenses: z.string().describe('A JSON string representing the list of expenses within the specified date range.'),
      numberOfDays: z.number().describe('The number of days in the analysis period.'),
    }),
  },
  output: {
    schema: AnalyzeExpenseTrendsOutputSchema,
  },
  prompt: `Analyze the user's expense trends based on the following data between {{startDate}} and {{endDate}} ({{numberOfDays}} days):\n\nExpenses: {{{expenses}}}\n\nCalculate the total spending, average daily spending, and identify the top 3-5 spending categories with their amounts and percentage of the total spending. Provide a brief summary (1-2 sentences) of the spending patterns observed. Ensure calculations are accurate.
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
  async input => {
    // Fetch all expenses (filtering might be needed depending on service implementation)
    const allExpenses = await getExpenses();

    // Filter expenses within the date range
    const filteredExpenses = allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= input.startDate && expenseDate <= input.endDate;
    });

    // Format data for the prompt
    const expensesString = JSON.stringify(filteredExpenses);
    const numberOfDays = differenceInDays(input.endDate, input.startDate) + 1; // Include both start and end dates

    const { output } = await analyzeExpenseTrendsPrompt({
      ...input,
      expenses: expensesString,
      numberOfDays: numberOfDays > 0 ? numberOfDays : 1, // Avoid division by zero or negative days
    });

    // Basic calculation fallback if AI fails or for simple cases
     if (!output?.totalSpending && filteredExpenses.length > 0) {
       const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
       const avgDaily = numberOfDays > 0 ? total / numberOfDays : total;
       // Simplified category calculation (consider moving full logic here if prompt is unreliable)
       const categories = filteredExpenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);
       const topCats = Object.entries(categories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }));

        return {
            totalSpending: total,
            averageDailySpending: avgDaily,
            topSpendingCategories: topCats,
            spendingSummary: output?.spendingSummary || "Basic summary: Review top categories.", // Provide a default summary
        };
     }

     // Ensure output matches schema, potentially filling gaps if AI missed something
     // For example, ensure topSpendingCategories is an array even if empty
     if (output && !Array.isArray(output.topSpendingCategories)) {
         output.topSpendingCategories = [];
     }


    return output!;
  }
);
