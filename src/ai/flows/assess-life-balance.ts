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
import type { LogEntry } from '@/services/daily-log'; // Now includes focusLevel
import type { Task } from '@/services/task';
import type { CalendarEvent } from '@/services/calendar';
import type { Expense } from '@/services/expense';
import type { Habit } from '@/services/habit';
import type { Goal } from '@/services/goal';
import { parseISO, isWithinInterval, formatISO } from 'date-fns';

// --- Constants ---
const LIFE_AREAS = ['Work/Career', 'Personal Growth', 'Health/Wellness', 'Social/Relationships', 'Finance', 'Hobbies/Leisure', 'Responsibilities/Chores'] as const;
type LifeArea = typeof LIFE_AREAS[number];

// Define Zod schemas for input data types (expecting ISO strings)
const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional(), // Added focusLevel
});
const InputTaskSchema = z.object({ id: z.string(), title: z.string(), status: z.enum(['Pending', 'In Progress', 'Completed']), createdAt: z.string().datetime().optional(), dueDate: z.string().datetime().optional() });
const InputEventSchema = z.object({ title: z.string(), start: z.string().datetime(), end: z.string().datetime() });
const InputExpenseSchema = z.object({ id: z.string(), category: z.string(), date: z.string().datetime(), description: z.string() }); // Added description
const InputHabitSchema = z.object({ id: z.string(), title: z.string(), frequency: z.string(), lastCompleted: z.string().datetime().optional(), updatedAt: z.string().datetime() }); // Added updatedAt
const InputGoalSchema = z.object({ id: z.string(), title: z.string(), status: z.string(), updatedAt: z.string().datetime() });

const AssessLifeBalanceInputSchema = z.object({
    startDate: z.string().datetime().describe('The start date (ISO 8601 format) for the analysis period.'),
    endDate: z.string().datetime().describe('The end date (ISO 8601 format) for the analysis period.'),
    dailyLogs: z.array(InputLogSchema).optional().describe('Daily logs within the period, including mood and focus level.'),
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
  rawCount: z.number().int().min(0).describe("Raw count of activities assigned to this area."),
});

const AssessLifeBalanceOutputSchema = z.object({
  areaScores: z.array(AreaScoreSchema).describe('Scores and counts for each life area based on analyzed activity.'),
  balanceSummary: z.string().describe('A brief (2-3 sentence) summary assessing the overall life balance and highlighting dominant or neglected areas. May comment on quality if focus levels suggest it.'),
  neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('List of life areas that appear significantly neglected based on the analysis (e.g., score below a threshold like 10%).'),
  suggestions: z.array(z.string()).optional().describe("1-2 actionable suggestions for improving balance, focusing on neglected areas."),
});
export type AssessLifeBalanceOutput = z.infer<typeof AssessLifeBalanceOutputSchema>;

// --- Categorization Logic ---
// More nuanced categorization hints
function categorizeActivity(activity: string | undefined, categoryHint?: string, focusLevel?: number): LifeArea | 'Uncategorized' {
    if (!activity) return 'Uncategorized';
    const lowerActivity = activity.toLowerCase();
    const lowerHint = categoryHint?.toLowerCase();

    // Prioritize Expense Categories for Finance/Responsibilities
    if (lowerHint === 'housing' || lowerHint === 'utilities' || lowerHint === 'finance' || lowerActivity.includes('bill') || lowerActivity.includes('budget') || lowerActivity.includes('tax') || lowerActivity.includes('invest')) return 'Finance';
    if (lowerHint === 'transport') return 'Responsibilities/Chores'; // Assume transport is chore unless work-related
    if (lowerHint === 'food') return 'Responsibilities/Chores'; // Basic need/chore
    if (lowerHint === 'health' || lowerActivity.includes('doctor') || lowerActivity.includes('pharmacy') || lowerActivity.includes('therapy')) return 'Health/Wellness';
    if (lowerHint === 'shopping' && !lowerActivity.includes('grocery')) return 'Hobbies/Leisure'; // Shopping as leisure unless specified
    if (lowerHint === 'entertainment' || lowerActivity.includes('movie') || lowerActivity.includes('game') || lowerActivity.includes('concert')) return 'Hobbies/Leisure';

    // Activity-based categorization
    if (lowerActivity.includes('work') || lowerActivity.includes('client') || lowerActivity.includes('meeting') || lowerActivity.includes('project') || lowerActivity.includes('report') || lowerActivity.includes('career') || lowerActivity.includes('job') || lowerActivity.includes('office') || lowerActivity.includes('email')) return 'Work/Career';
    if (lowerActivity.includes('gym') || lowerActivity.includes('workout') || lowerActivity.includes('run') || lowerActivity.includes('yoga') || lowerActivity.includes('exercise') || lowerActivity.includes('meditate') || lowerActivity.includes('walk') || lowerActivity.includes('sleep')) return 'Health/Wellness';
    if (lowerActivity.includes('learn') || lowerActivity.includes('course') || lowerActivity.includes('read') || lowerActivity.includes('study') || lowerActivity.includes('skill') || lowerActivity.includes('develop') || lowerActivity.includes('research') || lowerActivity.includes('podcast')) return 'Personal Growth';
    if (lowerActivity.includes('friend') || lowerActivity.includes('family') || lowerActivity.includes('social') || lowerActivity.includes('party') || lowerActivity.includes('date') || lowerActivity.includes('call mom') || lowerActivity.includes('hang out')) return 'Social/Relationships';
    if (lowerActivity.includes('hobby') || lowerActivity.includes('leisure') || lowerActivity.includes('relax') || lowerActivity.includes('music') || lowerActivity.includes('art') || lowerActivity.includes('watch tv')) return 'Hobbies/Leisure';
    if (lowerActivity.includes('chore') || lowerActivity.includes('clean') || lowerActivity.includes('errand') || lowerActivity.includes('grocery') || lowerActivity.includes('cook') || lowerActivity.includes('fix') || lowerActivity.includes('household') || lowerActivity.includes('laundry') || lowerActivity.includes('dishes')) return 'Responsibilities/Chores';

    // Consider focus level for ambiguity (e.g., 'Reading' could be Growth or Leisure)
    // if (lowerActivity.includes('read')) {
    //     return (focusLevel && focusLevel >= 4) ? 'Personal Growth' : 'Hobbies/Leisure';
    // }

    return 'Uncategorized';
}


// --- Exported Function ---
export async function assessLifeBalance(
  input: AssessLifeBalanceInput
): Promise<AssessLifeBalanceOutput> {
    return assessLifeBalanceFlow(input);
}

// --- Prompt Definition ---
const PromptInputSchema = z.object({
      areaCountsJson: z.string().describe(`JSON string representing the counts of logged activities categorized into life areas: ${JSON.stringify(LIFE_AREAS)}. Example: {"Work/Career": 15, "Health/Wellness": 5, ...}`),
      analysisPeriodDays: z.number().int().positive().describe('The number of days included in the analysis period (e.g., 30).'),
      areaScoresJson: z.string().describe('JSON string of calculated area scores: [{area, score}]'),
      focusLevelSummaryJson: z.string().optional().describe('JSON string summarizing average focus levels per area if available: [{"area": "Work/Career", "avgFocus": 4.2}]'),
});

const assessLifeBalancePrompt = ai.definePrompt({
  name: 'assessLifeBalancePrompt',
  input: { schema: PromptInputSchema },
  output: {
    schema: z.object({
        balanceSummary: z.string().describe('Write a brief **Balance Summary** (2-3 sentences) based on the provided scores/counts. Highlight the 1-2 most dominant areas and point out potentially neglected ones. Comment on the overall distribution. May comment on quality if focus levels suggest it (e.g., "Work/Career dominates activity, and focus levels reported during these activities were generally high.").'),
        neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('Identify 1-3 **Neglected Areas** that have significantly lower scores (e.g., below 10%) compared to the dominant areas, or zero counts.'),
        suggestions: z.array(z.string()).optional().describe('Provide 1-2 actionable **Suggestions** for improving balance, tailored to the neglected areas (e.g., "Schedule a recurring \'Personal Growth\' activity," "Block out time for \'Hobbies/Leisure\' this weekend"). Omit if balance seems good or data is insufficient.'),
    })
  },
  prompt: `You are an AI assistant helping users understand their life balance based on logged activities over the past {{analysisPeriodDays}} days.

Life Areas Considered: ${LIFE_AREAS.join(', ')}

Activity Counts by Life Area (JSON):
{{{areaCountsJson}}}

Calculated Scores by Life Area (JSON):
{{{areaScoresJson}}}

{{#if focusLevelSummaryJson}}
Average Focus Levels by Area (JSON, 1=Low, 5=High):
{{{focusLevelSummaryJson}}}
{{/if}}

Analysis Tasks:
1.  Based on the provided counts and scores, write a brief **Balance Summary** (2-3 sentences). Comment on which areas seem to receive the most focus (highest scores/counts) and which might be receiving less attention. {{#if focusLevelSummaryJson}}If focus data is present, briefly incorporate it (e.g., mention if a dominant area also had high focus).{{/if}}
2.  Identify 1-3 **Neglected Areas** based on low scores (e.g., below 10%) or zero counts.
3.  Provide 1-2 actionable **Suggestions** for improving balance, focusing on the neglected areas. If balance appears relatively even or data is sparse, omit this field or provide an empty array.

Generate the output in the specified JSON format. Focus solely on the distribution pattern shown by the counts and scores, incorporating focus insights if available.`,
});

// --- Flow Definition ---
const assessLifeBalanceFlow = ai.defineFlow<
  typeof AssessLifeBalanceInputSchema,
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

    // --- Activity Categorization & Focus Tracking ---
    const areaCounts: Record<LifeArea | 'Uncategorized', number> =
        Object.fromEntries([...LIFE_AREAS, 'Uncategorized'].map(area => [area, 0])) as any;
    const areaFocusTotals: Record<LifeArea, number> = Object.fromEntries(LIFE_AREAS.map(area => [area, 0])) as any;
    const areaFocusCounts: Record<LifeArea, number> = Object.fromEntries(LIFE_AREAS.map(area => [area, 0])) as any;

    // Categorize logs
    dailyLogs
        .filter(log => isWithinInterval(parseISO(log.date), { start, end }))
        .forEach(log => {
            const area = categorizeActivity(log.activity, undefined, log.focusLevel);
            areaCounts[area]++;
            if (area !== 'Uncategorized' && log.focusLevel) {
                areaFocusTotals[area] += log.focusLevel;
                areaFocusCounts[area]++;
            }
        });

    // Categorize tasks
    tasks
        .filter(task => {
            const createdAt = task.createdAt ? parseISO(task.createdAt) : null;
            const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
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

     // Categorize expenses
     expenses
         .filter(exp => isWithinInterval(parseISO(exp.date), { start, end }))
         .forEach(exp => {
             const area = categorizeActivity(exp.description, exp.category);
             areaCounts[area]++;
              if (area === 'Finance') { // Track financial activities specifically?
                 // Could add finance-specific tracking here if needed
              }
         });

     // Categorize habits
     habits
         .filter(habit => {
             const updatedAt = parseISO(habit.updatedAt);
             const lastCompleted = habit.lastCompleted ? parseISO(habit.lastCompleted) : null;
             return isWithinInterval(updatedAt, { start, end }) || (lastCompleted && isWithinInterval(lastCompleted, { start, end }));
         })
         .forEach(habit => {
             const area = categorizeActivity(habit.title);
             areaCounts[area]++;
         });

      // Categorize goals
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

     // Calculate Average Focus per Area
     const focusLevelSummary = LIFE_AREAS.map(area => {
         const total = areaFocusTotals[area];
         const count = areaFocusCounts[area];
         return count > 0 ? { area, avgFocus: parseFloat((total / count).toFixed(1)) } : null;
     }).filter(item => item !== null) as { area: LifeArea; avgFocus: number }[];


     // Handle case with no categorized data
     if (totalCategorizedActivities === 0) {
         return {
             areaScores: LIFE_AREAS.map(area => ({ area, score: 0, rawCount: 0 })),
             balanceSummary: `No relevant activities found between ${formatISO(start, { representation: 'date' })} and ${formatISO(end, { representation: 'date' })} to assess life balance.`,
             neglectedAreas: [...LIFE_AREAS],
             suggestions: ["Start logging your activities across different life areas!"],
         };
     }


    // --- AI Call ---
    const promptInputData: z.infer<typeof PromptInputSchema> = {
        areaCountsJson: JSON.stringify(areaCounts),
        analysisPeriodDays: analysisPeriodDays,
        areaScoresJson: JSON.stringify(areaScores.map(({ area, score }) => ({ area, score }))),
        focusLevelSummaryJson: focusLevelSummary.length > 0 ? JSON.stringify(focusLevelSummary) : undefined,
    };

    const { output } = await assessLifeBalancePrompt(promptInputData);

      if (!output) {
         console.error('AI analysis failed to return output for life balance.');
          const calculatedNeglected = areaScores.filter(a => a.score < 10).map(a => a.area);
         return {
             areaScores,
             balanceSummary: "Could not generate AI summary. Review the scores: " + areaScores.map(a => `${a.area}: ${a.score}%`).join(', '),
             neglectedAreas: calculatedNeglected,
             suggestions: calculatedNeglected.length > 0 ? [`Focus on incorporating activities related to: ${calculatedNeglected.join(', ')}.`] : ["Maintain your current balance!"],
         };
      }

    // Combine AI output with calculated scores
    return {
        areaScores,
        balanceSummary: output.balanceSummary,
        neglectedAreas: output.neglectedAreas,
        suggestions: output.suggestions,
    };
});
