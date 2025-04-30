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

const SummarizeDiaryEntriesInputSchema = z.object({
  diaryEntries: z.array(
    z.object({
      date: z.date().describe('The date of the diary entry.'),
      text: z.string().describe('The text content of the diary entry.'),
    })
  ).describe('An array of diary entries to summarize.'),
  frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).').optional(),
});
export type SummarizeDiaryEntriesInput = z.infer<typeof SummarizeDiaryEntriesInputSchema>;

const SummarizeDiaryEntriesOutputSchema = z.object({
  summary: z.string().describe('A summary of the diary entries, highlighting key events, emotions, and reflections.'),
  keyEvents: z.array(z.string()).describe('A list of key events identified in the diary entries.'),
  emotions: z.array(z.string()).describe('A list of emotions expressed in the diary entries.'),
  reflections: z.array(z.string()).describe('A list of personal reflections found in the diary entries.'),
});
export type SummarizeDiaryEntriesOutput = z.infer<typeof SummarizeDiaryEntriesOutputSchema>;

export async function summarizeDiaryEntries(input: SummarizeDiaryEntriesInput): Promise<SummarizeDiaryEntriesOutput> {
  return summarizeDiaryEntriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDiaryEntriesPrompt',
  input: {
    schema: z.object({
      diaryEntries: z.array(
        z.object({
          date: z.date().describe('The date of the diary entry.'),
          text: z.string().describe('The text content of the diary entry.'),
        })
      ).describe('An array of diary entries to summarize.'),
      frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).').optional(),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A summary of the diary entries, highlighting key events, emotions, and reflections.'),
      keyEvents: z.array(z.string()).describe('A list of key events identified in the diary entries.'),
      emotions: z.array(z.string()).describe('A list of emotions expressed in the diary entries.'),
      reflections: z.array(z.string()).describe('A list of personal reflections found in the diary entries.'),
    }),
  },
  prompt: `You are an AI assistant designed to summarize diary entries and provide insights for personal development.

  Summarize the following diary entries, highlighting key events, emotions, and personal reflections.
  The summarization frequency is set to {{frequency}}.

  Diary Entries:
  {{#each diaryEntries}}
  Date: {{this.date}}
  Text: {{this.text}}
  {{/each}}

  Output the summary, key events, emotions and reflections in a structured format. 
`,
});

const summarizeDiaryEntriesFlow = ai.defineFlow<
  typeof SummarizeDiaryEntriesInputSchema,
  typeof SummarizeDiaryEntriesOutputSchema
>({
  name: 'summarizeDiaryEntriesFlow',
  inputSchema: SummarizeDiaryEntriesInputSchema,
  outputSchema: SummarizeDiaryEntriesOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
