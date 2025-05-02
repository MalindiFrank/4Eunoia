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
// Removed date-fns imports as date filtering/categorization happens in component

// --- Constants ---
const LIFE_AREAS = ['Work/Career', 'Personal Growth', 'Health/Wellness', 'Social/Relationships', 'Finance', 'Hobbies/Leisure', 'Responsibilities/Chores'] as const;
type LifeArea = typeof LIFE_AREAS[number];

// --- Input/Output Schemas ---
const AreaCountSchema = z.object({
    area: z.enum([...LIFE_AREAS, 'Uncategorized']), // Allow Uncategorized input
    count: z.number().int().min(0),
});

const AssessLifeBalanceInputSchema = z.object({
    areaCounts: z.array(AreaCountSchema).describe(`An array of objects containing the count of activities for each life area over the analysis period. Areas: ${JSON.stringify(LIFE_AREAS)}, Uncategorized`),
    analysisPeriodDays: z.number().int().positive().describe('The number of days included in the analysis period (e.g., 30).'),
}).describe("Input for assessing life balance, requiring pre-categorized activity counts.");
export type AssessLifeBalanceInput = z.infer<typeof AssessLifeBalanceInputSchema>;

// Output schema remains the same
const AreaScoreSchema = z.object({
  area: z.enum(LIFE_AREAS),
  score: z.number().min(0).max(100).describe('Percentage score representing focus/activity in this area.'),
});

const AssessLifeBalanceOutputSchema = z.object({
  areaScores: z.array(AreaScoreSchema).describe('Scores for each life area based on analyzed activity.'),
  balanceSummary: z.string().describe('A brief (2-3 sentence) summary assessing the overall life balance and highlighting dominant or neglected areas.'),
  neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('List of life areas that appear significantly neglected based on the analysis (e.g., score below a threshold like 10%).'),
});
export type AssessLifeBalanceOutput = z.infer<typeof AssessLifeBalanceOutputSchema>;

// --- Exported Function ---
export async function assessLifeBalance(
  input: AssessLifeBalanceInput
): Promise<AssessLifeBalanceOutput> {
    // Input contains areaCounts and periodDays
    return assessLifeBalanceFlow(input);
}

// --- Prompt Definition ---
// Prompt input requires the JSON string of counts, similar to before
const PromptInputSchema = z.object({
      areaCountsJson: z.string().describe(`JSON string representing the counts of logged activities/tasks/events categorized into life areas: ${JSON.stringify(LIFE_AREAS)}. Example: {"Work/Career": 15, "Health/Wellness": 5, ...}`),
      analysisPeriodDays: z.number().describe('The number of days included in the analysis period (e.g., 30).')
});

const assessLifeBalancePrompt = ai.definePrompt({
  name: 'assessLifeBalancePrompt',
  input: { schema: PromptInputSchema },
  output: {
    // AI generates the summary and identifies neglected areas based on calculated scores
    schema: z.object({
        balanceSummary: z.string().describe('A brief (2-3 sentence) summary assessing the overall life balance based on the provided counts. Highlight dominant areas and potentially neglected ones.'),
        neglectedAreas: z.array(z.enum(LIFE_AREAS)).describe('List of life areas that appear significantly neglected based on the counts (e.g., very low count compared to others, or zero count). Identify 1-3 areas maximum.'),
        // areaScores are calculated outside AI
    })
  },
  prompt: `You are an AI assistant helping users understand their life balance based on logged activities over the past {{analysisPeriodDays}} days.

Activity Counts by Life Area (JSON):
{{{areaCountsJson}}}

Life Areas Considered: ${LIFE_AREAS.join(', ')}

Analysis Tasks:
1.  Based *only* on the provided activity counts, write a brief **Balance Summary** (2-3 sentences). Comment on which areas seem to receive the most focus and which might be receiving less attention.
2.  Identify 1-3 **Neglected Areas** that have significantly lower counts compared to the dominant areas, or zero counts.

Provide the output in the specified JSON format. Focus solely on the distribution pattern shown by the counts.`,
});

// --- Flow Definition ---
const assessLifeBalanceFlow = ai.defineFlow<
  typeof AssessLifeBalanceInputSchema, // Input now takes AreaCount[]
  typeof AssessLifeBalanceOutputSchema
>({
  name: 'assessLifeBalanceFlow',
  inputSchema: AssessLifeBalanceInputSchema,
  outputSchema: AssessLifeBalanceOutputSchema,
}, async (input) => {
    const { areaCounts, analysisPeriodDays } = input;

    // Convert array input to the Record format used for calculation and prompt
    const areaCountsRecord: Record<LifeArea | 'Uncategorized', number> =
        Object.fromEntries([...LIFE_AREAS, 'Uncategorized'].map(area => [area, 0])) as any;
    areaCounts.forEach(item => {
        areaCountsRecord[item.area] = item.count;
    });


    // Calculate total activities (excluding Uncategorized for percentage calculation)
    const totalCategorizedActivities = LIFE_AREAS.reduce((sum, area) => sum + (areaCountsRecord[area] || 0), 0);

    // Calculate percentage scores for each area
    const areaScores: z.infer<typeof AreaScoreSchema>[] = LIFE_AREAS.map(area => {
        const count = areaCountsRecord[area] || 0;
        const score = totalCategorizedActivities > 0 ? Math.round((count / totalCategorizedActivities) * 100) : 0;
        return { area, score };
    });

     // Handle case with no data
     if (totalCategorizedActivities === 0) {
         return {
             areaScores: LIFE_AREAS.map(area => ({ area, score: 0 })),
             balanceSummary: "No relevant activities found in the analysis period to assess life balance.",
             neglectedAreas: [...LIFE_AREAS], // All areas are neglected if no data
         };
     }


    // Prepare input for the AI prompt
    const promptInputData: z.infer<typeof PromptInputSchema> = {
        areaCountsJson: JSON.stringify(areaCountsRecord), // Pass the counts as JSON string
        analysisPeriodDays: analysisPeriodDays,
    };

    const { output } = await assessLifeBalancePrompt(promptInputData);

     // Handle potential null output from AI
      if (!output) {
         console.error('AI analysis failed to return output for life balance.');
          // Provide a fallback based on calculated scores
          const calculatedNeglected = areaScores.filter(a => a.score < 10).map(a => a.area); // Example threshold
         return {
             areaScores,
             balanceSummary: "Could not generate AI summary. Please review the calculated scores.",
             neglectedAreas: calculatedNeglected,
         };
      }

    // Combine AI output (summary, neglected areas) with calculated scores
    return {
        areaScores,
        balanceSummary: output.balanceSummary,
        neglectedAreas: output.neglectedAreas,
    };
});

    