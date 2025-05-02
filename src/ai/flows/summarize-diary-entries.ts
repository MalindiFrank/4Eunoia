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
import { formatISO } from 'date-fns'; // Keep only necessary imports

// Define structure for individual diary entries passed to the flow
const InputDiaryEntrySchema = z.object({
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
      date: z.string().datetime().describe('The date of the diary entry (ISO 8601 format).'),
      text: z.string().describe('The text content of the diary entry.'),
});

const SummarizeDiaryEntriesOutputSchema = z.object({
  summary: z.string().describe('A summary of the diary entries, highlighting key events, emotions, and reflections.'),
  keyEvents: z.array(z.string()).describe('A list of key events identified in the diary entries.'),
  emotions: z.array(z.string()).describe('A list of emotions expressed in the diary entries.'),
  reflections: z.array(z.string()).describe('A list of personal reflections found in the diary entries.'),
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
       summary: z.string().describe('A concise (2-4 sentences) summary of the diary entries, highlighting key events, dominant emotions, and significant personal reflections or insights.'),
       keyEvents: z.array(z.string()).describe('A list of 3-5 key events or activities mentioned in the diary entries.'),
       emotions: z.array(z.string()).describe('A list of 3-5 dominant or recurring emotions expressed in the diary entries (e.g., happy, stressed, excited, frustrated).'),
       reflections: z.array(z.string()).describe('A list of 2-4 significant personal reflections, insights, or questions posed in the diary entries.'),
     }),
  },
   prompt: `You are an AI assistant skilled in analyzing personal diary entries to provide insightful summaries for self-reflection and personal development.

  Analyze the following diary entries from {{startDate}} to {{endDate}} (summarized {{frequency}}).
  Identify key events, dominant emotions, and significant personal reflections.

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
            summary: `No diary entries found for this ${frequency}.`,
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
            date: entry.date,
            text: entry.text,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // Sort chronologically
        frequency: frequency,
        startDate: startDate,
        endDate: endDate,
    };

    const {output} = await prompt(promptInputData);

    // Combine AI output with calculated data
    return {
        summary: output?.summary || "Could not generate summary.",
        keyEvents: output?.keyEvents || [],
        emotions: output?.emotions || [],
        reflections: output?.reflections || [],
        entryCount: diaryEntries.length,
        dateRange: { start: startDate, end: endDate }, // Use dates passed from component
    };
});

    