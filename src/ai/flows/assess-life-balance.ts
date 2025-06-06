
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
import { parseISO, isWithinInterval, formatISO, isValid } from 'date-fns'; 

const LIFE_AREAS = ['Work/Career', 'Personal Growth', 'Health/Wellness', 'Social/Relationships', 'Finance', 'Hobbies/Leisure', 'Responsibilities/Chores'] as const;
type LifeArea = typeof LIFE_AREAS[number];

const InputLogSchema = z.object({
    id: z.string(),
    date: z.string().datetime(),
    activity: z.string(),
    mood: z.string().optional(),
    focusLevel: z.number().min(1).max(5).optional().nullable(), 
});
const InputTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['Pending', 'In Progress', 'Completed']),
    createdAt: z.string().datetime().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable()
});
const InputEventSchema = z.object({
    title: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime()
});
const InputExpenseSchema = z.object({
    id: z.string(),
    category: z.string(),
    date: z.string().datetime(),
    description: z.string()
});
const InputHabitSchema = z.object({
    id: z.string(),
    title: z.string(),
    frequency: z.string(),
    lastCompleted: z.string().datetime().optional().nullable(),
    updatedAt: z.string().datetime()
});
const InputGoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    updatedAt: z.string().datetime(),
    targetDate: z.string().datetime().optional().nullable(), 
});


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
  suggestions: z.array(z.string()).optional().describe("1-2 actionable and practical suggestions for improving balance, focusing on neglected areas. E.g., 'Try scheduling one 'Social/Relationships' activity this weekend' or 'Dedicate 30 minutes to 'Personal Growth' on Tuesday'."),
});
export type AssessLifeBalanceOutput = z.infer<typeof AssessLifeBalanceOutputSchema>;

function categorizeActivity(activity: string | undefined, categoryHint?: string, focusLevel?: number | null): LifeArea | 'Uncategorized' {
    if (!activity) return 'Uncategorized';
    const lowerActivity = activity.toLowerCase();
    const lowerHint = categoryHint?.toLowerCase();

    if (lowerHint === 'housing' || lowerHint === 'utilities' || lowerHint === 'finance' || lowerActivity.includes('bill') || lowerActivity.includes('budget') || lowerActivity.includes('tax') || lowerActivity.includes('invest')) return 'Finance';
    if (lowerHint === 'transport') return 'Responsibilities/Chores'; 
    if (lowerHint === 'food') return 'Responsibilities/Chores'; 
    if (lowerHint === 'health' || lowerActivity.includes('doctor') || lowerActivity.includes('pharmacy') || lowerActivity.includes('therapy')) return 'Health/Wellness';
    if (lowerHint === 'shopping' && !lowerActivity.includes('grocery')) return 'Hobbies/Leisure'; 
    if (lowerHint === 'entertainment' || lowerActivity.includes('movie') || lowerActivity.includes('game') || lowerActivity.includes('concert')) return 'Hobbies/Leisure';

    if (lowerActivity.includes('work') || lowerActivity.includes('client') || lowerActivity.includes('meeting') || lowerActivity.includes('project') || lowerActivity.includes('report') || lowerActivity.includes('career') || lowerActivity.includes('job') || lowerActivity.includes('office') || lowerActivity.includes('email')) return 'Work/Career';
    if (lowerActivity.includes('gym') || lowerActivity.includes('workout') || lowerActivity.includes('run') || lowerActivity.includes('yoga') || lowerActivity.includes('exercise') || lowerActivity.includes('meditate') || lowerActivity.includes('walk') || lowerActivity.includes('sleep')) return 'Health/Wellness';
    if (lowerActivity.includes('learn') || lowerActivity.includes('course') || lowerActivity.includes('read') || lowerActivity.includes('study') || lowerActivity.includes('skill') || lowerActivity.includes('develop') || lowerActivity.includes('research') || lowerActivity.includes('podcast')) return 'Personal Growth';
    if (lowerActivity.includes('friend') || lowerActivity.includes('family') || lowerActivity.includes('social') || lowerActivity.includes('party') || lowerActivity.includes('date') || lowerActivity.includes('call mom') || lowerActivity.includes('hang out')) return 'Social/Relationships';
    if (lowerActivity.includes('hobby') || lowerActivity.includes('leisure') || lowerActivity.includes('relax') || lowerActivity.includes('music') || lowerActivity.includes('art') || lowerActivity.includes('watch tv')) return 'Hobbies/Leisure';
    if (lowerActivity.includes('chore') || lowerActivity.includes('clean') || lowerActivity.includes('errand') || lowerActivity.includes('grocery') || lowerActivity.includes('cook') || lowerActivity.includes('fix') || lowerActivity.includes('household') || lowerActivity.includes('laundry') || lowerActivity.includes('dishes')) return 'Responsibilities/Chores';

    if (lowerActivity.includes('read')) {
         return (focusLevel && focusLevel >= 4) ? 'Personal Growth' : 'Hobbies/Leisure';
    }

    return 'Uncategorized';
}


export async function assessLifeBalance(
  input: AssessLifeBalanceInput
): Promise<AssessLifeBalanceOutput> {
    if (!input.startDate || !isValid(parseISO(input.startDate))) {
        throw new Error("Invalid or missing start date provided for life balance assessment.");
    }
    if (!input.endDate || !isValid(parseISO(input.endDate))) {
        throw new Error("Invalid or missing end date provided for life balance assessment.");
    }
    return assessLifeBalanceFlow(input);
}

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
        neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('Identify 1-3 **Neglected Areas** that have significantly lower scores (e.g., below 10%) or zero counts compared to the dominant areas.'),
        suggestions: z.array(z.string()).optional().describe('Provide 1-2 actionable and practical **Suggestions** for improving balance, tailored to the neglected areas (e.g., "Try scheduling one \'Social/Relationships\' activity like calling a friend this weekend," or "Dedicate 30 minutes to \'Personal Growth\' on Tuesday by reading a chapter of a book"). Omit if balance seems good or data is insufficient.'),
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
3.  Provide 1-2 actionable and practical **Suggestions** for improving balance, focusing on the neglected areas. For example, if 'Social/Relationships' is neglected, suggest "Reach out to a friend to schedule a coffee chat this week." If 'Hobbies/Leisure' is low, suggest "Block out 1 hour on Saturday for [Specific Hobby Interest if known, otherwise 'a relaxing activity']." If balance appears relatively even or data is sparse, omit this field or provide an empty array.

Generate the output in the specified JSON format. Focus solely on the distribution pattern shown by the counts and scores, incorporating focus insights if available.`,
});

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

    const isDateInRange = (dateString: string | null | undefined): boolean => {
        if (!dateString) return false;
        try {
            const date = parseISO(dateString);
            return isValid(date) && isWithinInterval(date, { start, end });
        } catch {
            return false;
        }
    };

    const areaCounts: Record<LifeArea | 'Uncategorized', number> =
        Object.fromEntries([...LIFE_AREAS, 'Uncategorized'].map(area => [area, 0])) as any;
    const areaFocusTotals: Record<LifeArea, number> = Object.fromEntries(LIFE_AREAS.map(area => [area, 0])) as any;
    const areaFocusCounts: Record<LifeArea, number> = Object.fromEntries(LIFE_AREAS.map(area => [area, 0])) as any;

    dailyLogs
        .filter(log => isDateInRange(log.date))
        .forEach(log => {
            const area = categorizeActivity(log.activity, undefined, log.focusLevel);
            areaCounts[area]++;
            if (area !== 'Uncategorized' && typeof log.focusLevel === 'number') {
                areaFocusTotals[area] += log.focusLevel;
                areaFocusCounts[area]++;
            }
        });

    tasks
        .filter(task => isDateInRange(task.createdAt) || isDateInRange(task.dueDate))
        .forEach(task => {
            const area = categorizeActivity(task.title);
            areaCounts[area]++;
        });

     calendarEvents
         .filter(event => isDateInRange(event.start))
         .forEach(event => {
             const area = categorizeActivity(event.title);
             areaCounts[area]++;
         });

     expenses
         .filter(exp => isDateInRange(exp.date))
         .forEach(exp => {
             const area = categorizeActivity(exp.description, exp.category);
             areaCounts[area]++;
         });

     habits
         .filter(habit => isDateInRange(habit.updatedAt) || isDateInRange(habit.lastCompleted))
         .forEach(habit => {
             const area = categorizeActivity(habit.title);
             areaCounts[area]++;
         });

      goals
          .filter(goal => isDateInRange(goal.updatedAt) || isDateInRange(goal.targetDate))
          .forEach(goal => {
              const area = categorizeActivity(goal.title);
              areaCounts[area]++;
          });

    const totalCategorizedActivities = LIFE_AREAS.reduce((sum, area) => sum + (areaCounts[area] || 0), 0);

    const areaScores: z.infer<typeof AreaScoreSchema>[] = LIFE_AREAS.map(area => {
        const count = areaCounts[area] || 0;
        const score = totalCategorizedActivities > 0 ? Math.round((count / totalCategorizedActivities) * 100) : 0;
        return { area, score, rawCount: count };
    });

     const focusLevelSummary = LIFE_AREAS.map(area => {
         const total = areaFocusTotals[area];
         const count = areaFocusCounts[area];
         return count > 0 ? { area, avgFocus: parseFloat((total / count).toFixed(1)) } : null;
     }).filter(item => item !== null) as { area: LifeArea; avgFocus: number }[];

     if (totalCategorizedActivities === 0) {
         return {
             areaScores: LIFE_AREAS.map(area => ({ area, score: 0, rawCount: 0 })),
             balanceSummary: `No relevant activities found between ${formatISO(start, { representation: 'date' })} and ${formatISO(end, { representation: 'date' })} to assess life balance.`,
             neglectedAreas: [...LIFE_AREAS],
             suggestions: ["Start logging your activities across different life areas!"],
         };
     }

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

    return {
        areaScores,
        balanceSummary: output.balanceSummary,
        neglectedAreas: output.neglectedAreas,
        suggestions: output.suggestions,
    };
});
