
'use server';

/**
 * @fileOverview Summarizes diary entries to highlight key events, emotions, and reflections for personal development.
 *
 * - summarizeDiaryEntries - A function that summarizes diary entries.
 * - SummarizeDiaryEntriesInput - The input type for the summarizeDiaryEntries function.
 * - SummarizeDiaryEntriesOutput - The return type for the summarizeDiaryEntries function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { formatISO, parseISO } from 'date-fns';
import type { LogEntry } from '@/services/daily-log'; // Use service type

// Define structure for individual diary entries passed to the flow
const InputDiaryEntrySchema = z.object({
  id: z.string(),
  date: z.string().datetime(), // Expect ISO string
  text: z.string(),
});

const SummarizeDiaryEntriesInputSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).'),
  // Add diary entries as input
  diaryEntries: z.array(InputDiaryEntrySchema).describe('An array of diary entry objects to summarize.'),
  // Dates are now part of the context, determined by component based on frequency
   startDate: z.string().datetime().describe('The start date (ISO 8601 format) of the period being summarized.'),
   endDate: z.string().datetime().describe('The end date (ISO 8601 format) of the period being summarized.'),
});
export type SummarizeDiaryEntriesInput = z.infer<typeof SummarizeDiaryEntriesInputSchema>;


// Zod schema for diary entries passed *to the prompt*. Keep string date.
const DiaryEntryPromptSchema = z.object({
      id: z.string(), // Include ID
      date: z.string().datetime().describe('The date of the diary entry (ISO 8601 format).'),
      text: z.string().describe('The text content of the diary entry.'),
});

const SummarizeDiaryEntriesOutputSchema = z.object({
  summary: z.string().describe('A summary of the diary entries, focusing on the overall emotional tone, key themes, and actionable insights.'),
  keyEvents: z.array(z.string()).describe('A list of 2-4 significant events or activities mentioned.'),
  emotions: z.array(z.string()).describe('A list of 2-4 dominant or recurring emotions expressed (e.g., happy, stressed, excited).'),
  reflections: z.array(z.string()).describe('A list of 1-3 key personal reflections, questions, or insights identified for self-growth.'),
   entryCount: z.number().describe('The number of diary entries summarized.'),
   // Use string dates in the final Zod output schema to match JSON validation
   dateRange: z.object({
       start: z.string().datetime().describe('Start date (ISO 8601 format) of the summarized period.'),
       end: z.string().datetime().describe('End date (ISO 8601 format) of the summarized period.'),
   }).describe('The date range covered by the summary.'),
});
export type SummarizeDiaryEntriesOutput = z.infer<typeof SummarizeDiaryEntriesOutputSchema>;


export async function summarizeDiaryEntries(input: SummarizeDiaryEntriesInput): Promise<SummarizeDiaryEntriesOutput> {
  // Input already contains diaryEntries, startDate, endDate
  return summarizeDiaryEntriesFlow(input);
}

// Define the prompt input schema using string dates (as received in flow input)
const PromptInputSchema = z.object({
      diaryEntries: z.array(DiaryEntryPromptSchema).describe('An array of diary entries to summarize, sorted chronologically.'),
      frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).'),
       startDate: z.string().datetime().describe('The start date (ISO 8601 format) of the period being summarized.'),
       endDate: z.string().datetime().describe('The end date (ISO 8601 format) of the period being summarized.'),
    });

const prompt = ai.definePrompt({
  name: 'summarizeDiaryEntriesPrompt',
  input: {
    schema: PromptInputSchema,
  },
  output: {
     // Omitting entryCount and dateRange from AI output schema, as we calculate them outside
     schema: z.object({
       summary: z.string().describe('Provide a concise (3-5 sentences) **Summary** of the diary entries. Focus on the overall emotional tone of the period ({{frequency}}), identify 1-2 recurring themes or key areas of focus (e.g., work stress, relationship reflections, progress on a goal), and mention any potential actionable insights or questions raised by the user.'),
       keyEvents: z.array(z.string()).describe('List 2-4 significant **Key Events** or activities mentioned (e.g., "Completed project," "Had argument," "Started new hobby").'),
       emotions: z.array(z.string()).describe('List 2-4 dominant or recurring **Emotions** expressed (e.g., "Gratitude," "Frustration," "Excitement," "Anxiety").'),
       reflections: z.array(z.string()).describe('Identify 1-3 key personal **Reflections**, insights, or questions posed in the entries that suggest areas for self-growth (e.g., "Questioning career path," "Realizing the need for better boundaries," "Acknowledging a pattern of procrastination").'),
     }),
  },
   prompt: `You are an AI assistant skilled in analyzing personal diary entries to provide insightful summaries for self-reflection and personal development.

  Analyze the following diary entries from {{startDate}} to {{endDate}} (summarized {{frequency}}). Focus on extracting the emotional tone, key themes, and points for self-reflection.

  Diary Entries (Chronological):
  {{#if diaryEntries}}
  {{#each diaryEntries}}
  Date: {{this.date}}
  Text: {{{this.text}}}
  ---
  {{/each}}
  {{else}}
  No diary entries found for this period.
  {{/if}}

  Provide the output in the specified JSON format. Be concise and focus on the most salient points for personal growth. If no entries are found, provide a default message in the summary field and empty arrays for the others.
`,
});

const summarizeDiaryEntriesFlow = ai.defineFlow<
  typeof SummarizeDiaryEntriesInputSchema, // Includes diaryEntries, frequency, startDate, endDate
  typeof SummarizeDiaryEntriesOutputSchema
>({
  name: 'summarizeDiaryEntriesFlow',
  inputSchema: SummarizeDiaryEntriesInputSchema,
  outputSchema: SummarizeDiaryEntriesOutputSchema,
}, async (input) => {
    const { diaryEntries, frequency, startDate, endDate } = input;

    // Handle no entries case before calling the prompt
    if (!diaryEntries || diaryEntries.length === 0) {
        return {
            summary: `No diary entries found for this ${frequency} period (${formatISO(parseISO(startDate), { representation: 'date'})} to ${formatISO(parseISO(endDate), { representation: 'date'})}).`,
            keyEvents: [],
            emotions: [],
            reflections: [],
            entryCount: 0,
            dateRange: { start: startDate, end: endDate }, // Use dates passed from component
        };
    }

    // Prepare data for the prompt (dates are already ISO strings)
    const promptInputData: z.infer<typeof PromptInputSchema> = {
        diaryEntries: diaryEntries.map(entry => ({ // Ensure structure matches prompt schema
            id: entry.id, // Pass ID
            date: entry.date,
            text: entry.text,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // Sort chronologically
        frequency: frequency,
        startDate: startDate,
        endDate: endDate,
    };

    const {output} = await prompt(promptInputData);

    // Add fallback if AI output is missing
     if (!output) {
         console.error('AI analysis failed to return output for diary summary.');
         return {
             summary: "Error: Could not generate diary summary.",
             keyEvents: [],
             emotions: [],
             reflections: [],
             entryCount: diaryEntries.length,
             dateRange: { start: startDate, end: endDate },
         };
     }

    // Combine AI output with calculated data
    return {
        summary: output.summary,
        keyEvents: output.keyEvents,
        emotions: output.emotions,
        reflections: output.reflections,
        entryCount: diaryEntries.length,
        dateRange: { start: startDate, end: endDate }, // Use dates passed from component
    };
});
