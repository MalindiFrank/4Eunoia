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
 * @fileOverview Analyzes task data to calculate completion rates and identify patterns.
 *
 * - analyzeTaskCompletion - A function that analyzes task data and provides insights.
 * - AnalyzeTaskCompletionInput - The input type for the analyzeTaskCompletion function.
 * - AnalyzeTaskCompletionOutput - The return type for the analyzeTaskCompletion function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { getTasks, Task } from '@/services/task'; // Import Task type

const AnalyzeTaskCompletionInputSchema = z.object({
  startDate: z.date().describe('The start date for analyzing task completion.'),
  endDate: z.date().describe('The end date for analyzing task completion.'),
});
export type AnalyzeTaskCompletionInput = z.infer<
  typeof AnalyzeTaskCompletionInputSchema
>;

const TaskSchema = z.object({ // Re-define for output consistency if needed
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.date().optional(),
    status: z.enum(['Pending', 'In Progress', 'Completed']),
});

const AnalyzeTaskCompletionOutputSchema = z.object({
  totalTasksConsidered: z.number().describe('The total number of tasks considered within the date range (based on due date or creation date).'),
  completedTasks: z.number().describe('The number of tasks marked as completed within the date range.'),
  completionRate: z.number().describe('The percentage of tasks completed (completedTasks / totalTasksConsidered * 100).'),
  overdueTasks: z.array(TaskSchema).describe('A list of tasks that were due within the date range but are not marked as completed.'),
  completionSummary: z.string().describe('A brief textual summary of the task completion performance.'),
});
export type AnalyzeTaskCompletionOutput = z.infer<
  typeof AnalyzeTaskCompletionOutputSchema
>;

export async function analyzeTaskCompletion(
  input: AnalyzeTaskCompletionInput
): Promise<AnalyzeTaskCompletionOutput> {
  return analyzeTaskCompletionFlow(input);
}

const analyzeTaskCompletionPrompt = ai.definePrompt({
  name: 'analyzeTaskCompletionPrompt',
  input: {
    schema: z.object({
      startDate: z.date().describe('The start date for analyzing task completion.'),
      endDate: z.date().describe('The end date for analyzing task completion.'),
      tasks: z.string().describe('A JSON string representing the list of relevant tasks (e.g., due within the range or created within the range).'),
    }),
  },
  output: {
    schema: AnalyzeTaskCompletionOutputSchema,
  },
  prompt: `Analyze the user's task completion performance based on the following tasks between {{startDate}} and {{endDate}}:\n\nTasks: {{{tasks}}}\n\nTasks considered are those with a due date within the specified range OR created within the range if no due date exists. Calculate the total number of tasks considered, the number of completed tasks among them, and the completion rate (completed / total * 100). Identify any tasks that were due within the range but are not marked as 'Completed'. Provide a brief summary (1-2 sentences) of the task completion performance. Ensure calculations are accurate. If totalTasksConsidered is 0, the completion rate should be 0. Return overdue tasks as an array of Task objects matching the schema.
`,
});


const analyzeTaskCompletionFlow = ai.defineFlow<
  typeof AnalyzeTaskCompletionInputSchema,
  typeof AnalyzeTaskCompletionOutputSchema
>(
  {
    name: 'analyzeTaskCompletionFlow',
    inputSchema: AnalyzeTaskCompletionInputSchema,
    outputSchema: AnalyzeTaskCompletionOutputSchema,
  },
  async (input) => {
    // Fetch all tasks (service might need enhancement for date filtering later)
    const allTasks = await getTasks();
    const today = new Date(); // Use a fixed date for overdue comparison

    // Filter tasks relevant to the date range (due date within range or created within range if no due date)
    // Note: We fetch *all* tasks for now, the prompt will handle the logic based on the provided range and task list.
    // More sophisticated filtering could happen here if the service supported it.
    const relevantTasks = allTasks.filter(task => {
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
             // Consider tasks due within the range
            return dueDate >= input.startDate && dueDate <= input.endDate;
        }
        // Consider tasks without due date if created within range (assuming createdAt exists or can be added)
        // else {
        //    const createdAt = new Date(task.createdAt); // Assuming createdAt exists
        //    return createdAt >= input.startDate && createdAt <= input.endDate;
        // }
        return false; // For now, only consider tasks with due dates in range for simplicity
    });


    const tasksString = JSON.stringify(relevantTasks);

    const { output } = await analyzeTaskCompletionPrompt({
      ...input,
      tasks: tasksString,
    });

    // Basic calculation fallback/verification
    if (!output && relevantTasks.length > 0) {
        const totalConsidered = relevantTasks.length;
        const completed = relevantTasks.filter(t => t.status === 'Completed').length;
        const rate = totalConsidered > 0 ? (completed / totalConsidered) * 100 : 0;
        const overdue = relevantTasks.filter(t => t.dueDate && new Date(t.dueDate) <= today && t.status !== 'Completed');

         return {
            totalTasksConsidered: totalConsidered,
            completedTasks: completed,
            completionRate: rate,
            overdueTasks: overdue, // Return actual Task objects
            completionSummary: "Basic summary: Review completion rate and overdue tasks.",
        };
    } else if (!output) {
         return { // Handle case with no relevant tasks
            totalTasksConsidered: 0,
            completedTasks: 0,
            completionRate: 0,
            overdueTasks: [],
            completionSummary: "No tasks found within the specified date range.",
        };
    }

     // Ensure output schema adherence, especially for the array
     if (output && !Array.isArray(output.overdueTasks)) {
         output.overdueTasks = [];
     }


    return output!;
  }
);
