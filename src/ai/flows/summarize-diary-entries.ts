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
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

// Define the structure expected from localStorage
interface StoredLogEntry {
  id: string;
  date: string; // Date stored as ISO string
  activity: string;
  notes?: string;
  diaryEntry?: string;
}

const SummarizeDiaryEntriesInputSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).'),
});
export type SummarizeDiaryEntriesInput = z.infer<typeof SummarizeDiaryEntriesInputSchema>;

// Diary Entry type used within the flow/prompt
const DiaryEntrySchema = z.object({
      date: z.date().describe('The date of the diary entry.'),
      text: z.string().describe('The text content of the diary entry.'),
});
type DiaryEntry = z.infer<typeof DiaryEntrySchema>;

const SummarizeDiaryEntriesOutputSchema = z.object({
  summary: z.string().describe('A summary of the diary entries, highlighting key events, emotions, and reflections.'),
  keyEvents: z.array(z.string()).describe('A list of key events identified in the diary entries.'),
  emotions: z.array(z.string()).describe('A list of emotions expressed in the diary entries.'),
  reflections: z.array(z.string()).describe('A list of personal reflections found in the diary entries.'),
   entryCount: z.number().describe('The number of diary entries summarized.'),
   dateRange: z.object({
       start: z.date().describe('Start date of the summarized period.'),
       end: z.date().describe('End date of the summarized period.'),
   }).describe('The date range covered by the summary.'),
});
export type SummarizeDiaryEntriesOutput = z.infer<typeof SummarizeDiaryEntriesOutputSchema>;

// Function to load and parse logs from localStorage (runs server-side but accesses client concept)
// IMPORTANT: This direct localStorage access won't work in a real server environment.
// It works here because Next.js Server Actions *can* run code that might behave like client-side code
// during development or under certain conditions. For production, data needs to be fetched via API/DB.
const loadAndFilterLogs = (startDate: Date, endDate: Date): DiaryEntry[] => {
  // This is a conceptual placeholder. Direct localStorage access in Server Actions is not reliable.
  // In a real app, this data would come from a database via a service function.
  console.warn("Attempting to access localStorage in summarizeDiaryEntries flow. This is for demonstration and may not work in production.");
  // const storedLogsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-daily-logs') : null;
   const storedLogsRaw = null; // Simulate server environment where localStorage is unavailable

   let storedLogs: StoredLogEntry[] = [];
   if (storedLogsRaw) {
       try {
           storedLogs = JSON.parse(storedLogsRaw);
       } catch (e) {
           console.error("Error parsing logs from storage in AI flow:", e);
           return [];
       }
   } else {
        // Provide mock data if localStorage isn't accessible or empty (for demonstration)
         console.log("localStorage not available or empty in AI flow, using mock diary data.");
         const today = new Date();
          storedLogs = [
            { id: 'log-mock-1', date: subDays(today, 1).toISOString(), activity: 'Completed project proposal draft', notes: 'Sent for review to Jane.', diaryEntry: 'Felt productive today. The proposal took longer than expected but happy with the result.' },
            { id: 'log-mock-2', date: subDays(today, 2).toISOString(), activity: 'Team meeting and brainstorming session', notes: 'Discussed Q3 goals. Good ideas generated.', diaryEntry: 'Meeting was energizing. Need to follow up on action items.' },
            { id: 'log-mock-3', date: subDays(today, 8).toISOString(), activity: 'Worked on coding feature X', notes: 'Encountered a bug, spent time debugging.', diaryEntry: 'Frustrating day with the bug, but learned something new about the framework.' },
            { id: 'log-mock-4', date: subDays(today, 15).toISOString(), activity: 'Client call and presentation prep', notes: 'Call went well. Presentation needs more polishing.', diaryEntry: 'A bit nervous about the client feedback.' },
        ];
   }


  return storedLogs
    .map(log => ({
      ...log,
      date: parseISO(log.date), // Ensure date is a Date object
    }))
    .filter(log => log.diaryEntry && isWithinInterval(log.date, { start: startDate, end: endDate })) // Filter by date range and ensure diary entry exists
    .map(log => ({
      date: log.date,
      text: log.diaryEntry!, // Non-null assertion as we filtered
    }))
     .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort chronologically for the prompt
};


export async function summarizeDiaryEntries(input: SummarizeDiaryEntriesInput): Promise<SummarizeDiaryEntriesOutput> {
  return summarizeDiaryEntriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDiaryEntriesPrompt',
  input: {
    schema: z.object({
      diaryEntries: z.array(DiaryEntrySchema).describe('An array of diary entries to summarize, sorted chronologically.'),
      frequency: z.enum(['weekly', 'monthly']).describe('The frequency of summarization (weekly or monthly).'),
       startDate: z.date().describe('The start date of the period being summarized.'),
       endDate: z.date().describe('The end date of the period being summarized.'),
    }),
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
  typeof SummarizeDiaryEntriesInputSchema,
  typeof SummarizeDiaryEntriesOutputSchema
>({
  name: 'summarizeDiaryEntriesFlow',
  inputSchema: SummarizeDiaryEntriesInputSchema,
  outputSchema: SummarizeDiaryEntriesOutputSchema,
}, async (input) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (input.frequency === 'weekly') {
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Assuming week starts on Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else { // monthly
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Fetch and filter diary entries
    const diaryEntries = loadAndFilterLogs(startDate, endDate);

    // Handle no entries case before calling the prompt
    if (diaryEntries.length === 0) {
        return {
            summary: `No diary entries found for this ${input.frequency}.`,
            keyEvents: [],
            emotions: [],
            reflections: [],
            entryCount: 0,
            dateRange: { start: startDate, end: endDate },
        };
    }


  const {output} = await prompt({
      diaryEntries,
      frequency: input.frequency,
      startDate,
      endDate,
  });

   // Combine AI output with calculated data
    return {
        summary: output?.summary || "Could not generate summary.",
        keyEvents: output?.keyEvents || [],
        emotions: output?.emotions || [],
        reflections: output?.reflections || [],
        entryCount: diaryEntries.length,
        dateRange: { start: startDate, end: endDate },
    };
});
