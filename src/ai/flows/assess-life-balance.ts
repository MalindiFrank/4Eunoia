
'use server';

/**
 * @fileOverview Assesses the user's life balance across predefined areas based on logged data.
 *
 * - assessLifeBalance - A function that analyzes data for life balance assessment.
 * - AssessLifeBalanceInput - The input type for the assessLifeBalance function.
 * - AssessLifeBalanceOutput - The return type for the assessLifeBalance function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { LogEntry } from '@/services/daily-log';
import type { Task } from '@/services/task';
import type { CalendarEvent } from '@/services/calendar';
import type { Expense } from '@/services/expense';
import type { Habit } from '@/services/habit';
import type { Goal } from '@/services/goal';
import { parseISO, isWithinInterval } from 'date-fns';

// --- Constants ---
const LIFE_AREAS = ['Work/Career', 'Personal Growth', 'Health/Wellness', 'Social/Relationships', 'Finance', 'Hobbies/Leisure', 'Responsibilities/Chores'] as const;
type LifeArea = typeof LIFE_AREAS[number];

// Define Zod schemas for input data types (expecting ISO strings)
const InputLogSchema = z.object({ id: z.string(), date: z.string().datetime(), activity: z.string(), mood: z.string().optional() });
const InputTaskSchema = z.object({ id: z.string(), title: z.string(), status: z.enum(['Pending', 'In Progress', 'Completed']), createdAt: z.string().datetime().optional(), dueDate: z.string().datetime().optional() });
const InputEventSchema = z.object({ title: z.string(), start: z.string().datetime(), end: z.string().datetime() });
const InputExpenseSchema = z.object({ id: z.string(), category: z.string(), date: z.string().datetime() });
const InputHabitSchema = z.object({ id: z.string(), title: z.string(), frequency: z.string(), lastCompleted: z.string().datetime().optional() });
const InputGoalSchema = z.object({ id: z.string(), title: z.string(), status: z.string(), updatedAt: z.string().datetime() });

const AssessLifeBalanceInputSchema = z.object({
    startDate: z.string().datetime().describe('The start date (ISO 8601 format) for the analysis period.'),
    endDate: z.string().datetime().describe('The end date (ISO 8601 format) for the analysis period.'),
    dailyLogs: z.array(InputLogSchema).optional().describe('Daily logs within the period.'),
    tasks: z.array(InputTaskSchema).optional().describe('Tasks created or due within the period.'),
    calendarEvents: z.array(InputEventSchema).optional().describe('Calendar events within the period.'),
    expenses: z.array(InputExpenseSchema).optional().describe('Expenses within the period.'),
    habits: z.array(InputHabitSchema).optional().describe('Habits relevant to the period.'),
    goals: z.array(InputGoalSchema).optional().describe('Goals updated within the period.'),
}).describe("Input for assessing life balance based on various user data points.");
export type AssessLifeBalanceInput = z.infer<typeof AssessLifeBalanceInputSchema>;


const AreaScoreSchema = z.object({
  area: z.enum(LIFE_AREAS),
  score: z.number().min(0).max(100).describe('Percentage score representing focus/activity in this area.'),
  rawCount: z.number().int().min(0).describe("Raw count of activities assigned to this area."), // Add raw count
});

const AssessLifeBalanceOutputSchema = z.object({
  areaScores: z.array(AreaScoreSchema).describe('Scores and counts for each life area based on analyzed activity.'),
  balanceSummary: z.string().describe('A brief (2-3 sentence) summary assessing the overall life balance and highlighting dominant or neglected areas.'),
  neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('List of life areas that appear significantly neglected based on the analysis (e.g., score below a threshold like 10%).'),
  suggestions: z.array(z.string()).optional().describe("1-2 actionable suggestions for improving balance, focusing on neglected areas."),
});
export type AssessLifeBalanceOutput = z.infer<typeof AssessLifeBalanceOutputSchema>;

// --- Categorization Logic (Simplified Example) ---
// In a real app, this could be more sophisticated, possibly using AI or user tags
function categorizeActivity(activity: string | undefined, categoryHint?: string): LifeArea | 'Uncategorized' {
    if (!activity) return 'Uncategorized';
    const lowerActivity = activity.toLowerCase();
    const lowerHint = categoryHint?.toLowerCase();

    if (lowerHint === 'food' || lowerHint === 'housing' || lowerHint === 'utilities') return 'Finance';
    if (lowerHint === 'transport' && !lowerActivity.includes('work')) return 'Responsibilities/Chores';
    if (lowerHint === 'health') return 'Health/Wellness';
    if (lowerHint === 'shopping') return 'Hobbies/Leisure'; // Assumption
    if (lowerHint === 'entertainment') return 'Hobbies/Leisure';

    if (lowerActivity.includes('work') || lowerActivity.includes('client') || lowerActivity.includes('meeting') || lowerActivity.includes('project') || lowerActivity.includes('report') || lowerActivity.includes('career') || lowerActivity.includes('job')) return 'Work/Career';
    if (lowerActivity.includes('gym') || lowerActivity.includes('workout') || lowerActivity.includes('run') || lowerActivity.includes('meditate') || lowerActivity.includes('yoga') || lowerActivity.includes('doctor') || lowerActivity.includes('health')) return 'Health/Wellness';
    if (lowerActivity.includes('learn') || lowerActivity.includes('course') || lowerActivity.includes('read') || lowerActivity.includes('study') || lowerActivity.includes('skill') || lowerActivity.includes('develop')) return 'Personal Growth';
    if (lowerActivity.includes('friend') || lowerActivity.includes('family') || lowerActivity.includes('social') || lowerActivity.includes('party') || lowerActivity.includes('date') || lowerActivity.includes('call mom')) return 'Social/Relationships';
    if (lowerActivity.includes('bills') || lowerActivity.includes('budget') || lowerActivity.includes('finance') || lowerActivity.includes('save') || lowerActivity.includes('invest')) return 'Finance';
    if (lowerActivity.includes('hobby') || lowerActivity.includes('movie') || lowerActivity.includes('game') || lowerActivity.includes('leisure') || lowerActivity.includes('relax') || lowerActivity.includes('music') || lowerActivity.includes('art')) return 'Hobbies/Leisure';
    if (lowerActivity.includes('chore') || lowerActivity.includes('clean') || lowerActivity.includes('errand') || lowerActivity.includes('groceries') || lowerActivity.includes('fix') || lowerActivity.includes('household')) return 'Responsibilities/Chores';

    return 'Uncategorized';
}


// --- Exported Function ---
export async function assessLifeBalance(
  input: AssessLifeBalanceInput
): Promise<AssessLifeBalanceOutput> {
    // Input contains all raw data arrays
    return assessLifeBalanceFlow(input);
}

// --- Prompt Definition ---
// Prompt input requires the calculated counts and the analysis period
const PromptInputSchema = z.object({
      areaCountsJson: z.string().describe(`JSON string representing the counts of logged activities categorized into life areas: ${JSON.stringify(LIFE_AREAS)}. Example: {"Work/Career": 15, "Health/Wellness": 5, ...}`),
      analysisPeriodDays: z.number().int().positive().describe('The number of days included in the analysis period (e.g., 30).'),
      // Provide percentage scores for context
      areaScoresJson: z.string().describe('JSON string of calculated area scores: [{area, score}]'),
});

const assessLifeBalancePrompt = ai.definePrompt({
  name: 'assessLifeBalancePrompt',
  input: { schema: PromptInputSchema },
  output: {
    // AI generates the summary, neglected areas, and suggestions based on calculated scores/counts
    schema: z.object({
        balanceSummary: z.string().describe('Write a brief **Balance Summary** (2-3 sentences) based on the provided scores/counts. Highlight the 1-2 most dominant areas and point out potentially neglected ones. Comment on the overall distribution.'),
        neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('Identify 1-3 **Neglected Areas** that have significantly lower scores (e.g., below 10%) compared to the dominant areas, or zero counts.'),
        suggestions: z.array(z.string()).optional().describe('Provide 1-2 actionable **Suggestions** for improving balance, tailored to the neglected areas (e.g., "Schedule a recurring 'Personal Growth' activity," "Block out time for 'Hobbies/Leisure' this weekend"). Omit if balance seems good or data is insufficient.'),
    })
  },
  prompt: `You are an AI assistant helping users understand their life balance based on logged activities over the past {{analysisPeriodDays}} days.

Life Areas Considered: ${LIFE_AREAS.join(', ')}

Activity Counts by Life Area (JSON):
{{{areaCountsJson}}}

Calculated Scores by Life Area (JSON):
{{{areaScoresJson}}}

Analysis Tasks:
1.  Based on the provided counts and scores, write a brief **Balance Summary** (2-3 sentences). Comment on which areas seem to receive the most focus (highest scores/counts) and which might be receiving less attention.
2.  Identify 1-3 **Neglected Areas** based on low scores (e.g., below 10%) or zero counts.
3.  Provide 1-2 actionable **Suggestions** for improving balance, focusing on the neglected areas. If balance appears relatively even or data is sparse, omit this field or provide an empty array.

Generate the output in the specified JSON format. Focus solely on the distribution pattern shown by the counts and scores.`,
});

// --- Flow Definition ---
const assessLifeBalanceFlow = ai.defineFlow<
  typeof AssessLifeBalanceInputSchema, // Input takes raw data arrays
  typeof AssessLifeBalanceOutputSchema
>({
  name: 'assessLifeBalanceFlow',
  inputSchema: AssessLifeBalanceInputSchema,
  outputSchema: AssessLifeBalanceOutputSchema,
}, async (input) => {
    const { startDate, endDate, dailyLogs = [], tasks = [], calendarEvents = [], expenses = [], habits = [], goals = [] } = input;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const analysisPeriodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // --- Activity Categorization ---
    const areaCounts: Record<LifeArea | 'Uncategorized', number> =
        Object.fromEntries([...LIFE_AREAS, 'Uncategorized'].map(area => [area, 0])) as any;

    // Categorize logs within the date range
    dailyLogs
        .filter(log => isWithinInterval(parseISO(log.date), { start, end }))
        .forEach(log => {
            const area = categorizeActivity(log.activity);
            areaCounts[area]++;
        });

    // Categorize tasks (consider created or due within range, or completed within range)
    tasks
        .filter(task => {
            const createdAt = task.createdAt ? parseISO(task.createdAt) : null;
            const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
            // Simplistic check: consider if created or due within range
            return (createdAt && isWithinInterval(createdAt, { start, end })) ||
                   (dueDate && isWithinInterval(dueDate, { start, end }));
        })
        .forEach(task => {
            const area = categorizeActivity(task.title);
            areaCounts[area]++;
        });

     // Categorize events
     calendarEvents
         .filter(event => isWithinInterval(parseISO(event.start), { start, end }))
         .forEach(event => {
             const area = categorizeActivity(event.title);
             areaCounts[area]++;
         });

     // Categorize expenses (using expense category as hint)
     expenses
         .filter(exp => isWithinInterval(parseISO(exp.date), { start, end }))
         .forEach(exp => {
             const area = categorizeActivity(exp.description, exp.category);
             areaCounts[area]++;
         });

     // Categorize habits (consider if active/updated recently)
     habits
         .filter(habit => {
             const updatedAt = parseISO(habit.updatedAt); // Assuming habits have updatedAt
             const lastCompleted = habit.lastCompleted ? parseISO(habit.lastCompleted) : null;
             return isWithinInterval(updatedAt, { start, end }) || (lastCompleted && isWithinInterval(lastCompleted, { start, end }));
         })
         .forEach(habit => {
             const area = categorizeActivity(habit.title);
             areaCounts[area]++;
         });

      // Categorize goals (if updated in the period)
      goals
          .filter(goal => isWithinInterval(parseISO(goal.updatedAt), { start, end }))
          .forEach(goal => {
              const area = categorizeActivity(goal.title);
              areaCounts[area]++;
          });


    // --- Calculate Scores ---
    const totalCategorizedActivities = LIFE_AREAS.reduce((sum, area) => sum + (areaCounts[area] || 0), 0);

    const areaScores: z.infer<typeof AreaScoreSchema>[] = LIFE_AREAS.map(area => {
        const count = areaCounts[area] || 0;
        const score = totalCategorizedActivities > 0 ? Math.round((count / totalCategorizedActivities) * 100) : 0;
        return { area, score, rawCount: count };
    });

     // Handle case with no categorized data
     if (totalCategorizedActivities === 0) {
         return {
             areaScores: LIFE_AREAS.map(area => ({ area, score: 0, rawCount: 0 })),
             balanceSummary: `No relevant activities found between ${formatISO(start, { representation: 'date' })} and ${formatISO(end, { representation: 'date' })} to assess life balance.`,
             neglectedAreas: [...LIFE_AREAS], // All areas are neglected if no data
             suggestions: ["Start logging your activities across different life areas!"],
         };
     }


    // --- AI Call ---
    const promptInputData: z.infer<typeof PromptInputSchema> = {
        areaCountsJson: JSON.stringify(areaCounts), // Pass the calculated counts
        analysisPeriodDays: analysisPeriodDays,
        areaScoresJson: JSON.stringify(areaScores.map(({ area, score }) => ({ area, score }))), // Pass scores for context
    };

    const { output } = await assessLifeBalancePrompt(promptInputData);

     // Handle potential null output from AI
      if (!output) {
         console.error('AI analysis failed to return output for life balance.');
          // Provide a fallback based on calculated scores
          const calculatedNeglected = areaScores.filter(a => a.score < 10).map(a => a.area); // Example threshold
         return {
             areaScores,
             balanceSummary: "Could not generate AI summary. Review the scores: " + areaScores.map(a => `${a.area}: ${a.score}%`).join(', '),
             neglectedAreas: calculatedNeglected,
             suggestions: calculatedNeglected.length > 0 ? [`Focus on incorporating activities related to: ${calculatedNeglected.join(', ')}.`] : ["Maintain your current balance!"],
         };
      }

    // Combine AI output (summary, neglected areas) with calculated scores
    return {
        areaScores,
        balanceSummary: output.balanceSummary,
        neglectedAreas: output.neglectedAreas,
        suggestions: output.suggestions,
    };
});
