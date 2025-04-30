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
 * @fileOverview Analyzes user data to identify productivity patterns and suggests improvement strategies.
 *
 * - analyzeProductivityPatterns - A function that analyzes user data and provides insights.
 * - AnalyzeProductivityPatternsInput - The input type for the analyzeProductivityPatterns function.
 * - AnalyzeProductivityPatternsOutput - The return type for the analyzeProductivityPatterns function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { getCalendarEvents } from '@/services/calendar';
import { getUpcomingReminders } from '@/services/reminder';
import { getTasks } from '@/services/task';
import { getExpenses } from '@/services/expense';

const AnalyzeProductivityPatternsInputSchema = z.object({
  startDate: z.date().describe('The start date for analyzing productivity patterns.'),
  endDate: z.date().describe('The end date for analyzing productivity patterns.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or information to consider during the analysis.'),
});
export type AnalyzeProductivityPatternsInput = z.infer<
  typeof AnalyzeProductivityPatternsInputSchema
>;

const AnalyzeProductivityPatternsOutputSchema = z.object({
  peakPerformanceTimes: z
    .string()
    .describe('Identifies the times of day or days of the week when the user is most productive.'),
  recurringObstacles: z
    .string()
    .describe('Identifies any recurring obstacles or challenges that hinder the user’s productivity.'),
  suggestedStrategies: z
    .string()
    .describe('Provides personalized strategies and recommendations for improving productivity.'),
  overallAssessment: z
    .string()
    .describe('An overall assessment of the user’s productivity based on the analyzed data.'),
});
export type AnalyzeProductivityPatternsOutput = z.infer<
  typeof AnalyzeProductivityPatternsOutputSchema
>;

export async function analyzeProductivityPatterns(
  input: AnalyzeProductivityPatternsInput
): Promise<AnalyzeProductivityPatternsOutput> {
  return analyzeProductivityPatternsFlow(input);
}

const analyzeProductivityPatternsPrompt = ai.definePrompt({
  name: 'analyzeProductivityPatternsPrompt',
  input: {
    schema: z.object({
      startDate: z.date().describe('The start date for analyzing productivity patterns.'),
      endDate: z.date().describe('The end date for analyzing productivity patterns.'),
      calendarEvents: z
        .string()
        .describe('A list of calendar events within the specified date range.'),
      tasks: z.string().describe('A list of tasks with their status and due dates.'),
      expenses: z.string().describe('A list of expenses with their amounts and categories.'),
      reminders: z.string().describe('A list of upcoming reminders.'),
      additionalContext: z
        .string()
        .optional()
        .describe('Any additional context or information to consider during the analysis.'),
    }),
  },
  output: {
    schema: z.object({
      peakPerformanceTimes: z
        .string()
        .describe('Identifies the times of day or days of the week when the user is most productive.'),
      recurringObstacles: z
        .string()
        .describe('Identifies any recurring obstacles or challenges that hinder the user’s productivity.'),
      suggestedStrategies: z
        .string()
        .describe('Provides personalized strategies and recommendations for improving productivity.'),
      overallAssessment: z
        .string()
        .describe('An overall assessment of the user’s productivity based on the analyzed data.'),
    }),
  },
  prompt: `Analyze the user's productivity patterns based on the following data between {{startDate}} and {{endDate}}:\n\nCalendar Events: {{{calendarEvents}}}\n\nTasks: {{{tasks}}}\n\nExpenses: {{{expenses}}}\n\nReminders: {{{reminders}}}\n\nAdditional Context: {{{additionalContext}}}\n\nIdentify peak performance times, recurring obstacles, suggest strategies for improvement, and provide an overall assessment of the user’s productivity.  Make sure the output is well-formatted and easy to read.
`,
});

const analyzeProductivityPatternsFlow = ai.defineFlow<
  typeof AnalyzeProductivityPatternsInputSchema,
  typeof AnalyzeProductivityPatternsOutputSchema
>(
  {
    name: 'analyzeProductivityPatternsFlow',
    inputSchema: AnalyzeProductivityPatternsInputSchema,
    outputSchema: AnalyzeProductivityPatternsOutputSchema,
  },
  async input => {
    // Fetch data from services
    const calendarEvents = await getCalendarEvents(input.startDate, input.endDate);
    const upcomingReminders = await getUpcomingReminders();
    const tasks = await getTasks();
    const expenses = await getExpenses();

    // Format data for the prompt
    const calendarEventsString = JSON.stringify(calendarEvents);
    const tasksString = JSON.stringify(tasks);
    const expensesString = JSON.stringify(expenses);
    const remindersString = JSON.stringify(upcomingReminders);

    const { output } = await analyzeProductivityPatternsPrompt({
      ...input,
      calendarEvents: calendarEventsString,
      tasks: tasksString,
      expenses: expensesString,
      reminders: remindersString,
    });
    return output!;
  }
);
