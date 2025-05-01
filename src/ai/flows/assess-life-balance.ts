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
import { parseISO, isWithinInterval, formatISO, subDays, startOfDay, endOfDay } from 'date-fns';

// --- Data Loading (Adapting from other flows) ---
// Define core data structures needed for analysis
interface StoredLogEntry {
  id: string;
  date: string; // ISO string
  activity: string;
  // Potentially add category if logs can be categorized
}
interface Task {
  id: string;
  title: string;
  status: string; // Assuming status indicates completion/progress
  // Potentially add category if tasks can be categorized
  createdAt?: string; // ISO String
}
interface CalendarEvent {
    title: string;
    start: string; // ISO String
    end: string; // ISO String
    // Potentially add category
}
// Add Goal type if goals contribute to balance assessment
// interface Goal { id: string; title: string; status: string; category?: string }

// Define Life Areas
const LIFE_AREAS = ['Work/Career', 'Personal Growth', 'Health/Wellness', 'Social/Relationships', 'Finance', 'Hobbies/Leisure', 'Responsibilities/Chores'] as const;
type LifeArea = typeof LIFE_AREAS[number];

// Simple Keyword-Based Categorization (Replace with more robust method or AI categorization later)
const categorizeActivity = (text: string): LifeArea | 'Uncategorized' => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('work') || lowerText.includes('project') || lowerText.includes('meeting') || lowerText.includes('report') || lowerText.includes('client') || lowerText.includes('job')) return 'Work/Career';
    if (lowerText.includes('learn') || lowerText.includes('read') || lowerText.includes('course') || lowerText.includes('skill') || lowerText.includes('study')) return 'Personal Growth';
    if (lowerText.includes('gym') || lowerText.includes('workout') || lowerText.includes('run') || lowerText.includes('yoga') || lowerText.includes('meditate') || lowerText.includes('doctor') || lowerText.includes('health') || lowerText.includes('sleep') || lowerText.includes('walk')) return 'Health/Wellness';
    if (lowerText.includes('friend') || lowerText.includes('family') || lowerText.includes('partner') || lowerText.includes('social') || lowerText.includes('call mom') || lowerText.includes('date night')) return 'Social/Relationships';
    if (lowerText.includes('budget') || lowerText.includes('finance') || lowerText.includes('bill') || lowerText.includes('expense') || lowerText.includes('invest')) return 'Finance'; // Overlaps with Expenses, refine if needed
    if (lowerText.includes('hobby') || lowerText.includes('game') || lowerText.includes('movie') || lowerText.includes('music') || lowerText.includes('relax') || lowerText.includes('leisure') || lowerText.includes('watch')) return 'Hobbies/Leisure';
    if (lowerText.includes('chore') || lowerText.includes('errand') || lowerText.includes('clean') || lowerText.includes('grocery') || lowerText.includes('fix')) return 'Responsibilities/Chores';
    return 'Uncategorized';
};


// Function to load and categorize data within a date range
const loadAndCategorizeData = (startDate: Date, endDate: Date): Record<LifeArea | 'Uncategorized', number> => {
    const areaCounts: Record<LifeArea | 'Uncategorized', number> = Object.fromEntries([...LIFE_AREAS, 'Uncategorized'].map(area => [area, 0])) as any;

    console.warn("Attempting to access localStorage in assessLifeBalance flow. This is for demonstration.");

    // 1. Daily Logs
    // const storedLogsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-daily-logs') : null;
    const storedLogsRaw = null;
    let storedLogs: StoredLogEntry[] = [];
     if (storedLogsRaw) {
        try { storedLogs = JSON.parse(storedLogsRaw); } catch (e) { console.error("Error parsing logs:", e); }
     } else {
          // Mock logs if needed
         storedLogs = [
             { id: 'log-mock-lb1', date: subDays(new Date(), 1).toISOString(), activity: 'Worked on project presentation' },
             { id: 'log-mock-lb2', date: subDays(new Date(), 2).toISOString(), activity: 'Gym session and meditation' },
             { id: 'log-mock-lb3', date: subDays(new Date(), 3).toISOString(), activity: 'Dinner with friends' },
             { id: 'log-mock-lb4', date: subDays(new Date(), 4).toISOString(), activity: 'Read book on leadership' },
             { id: 'log-mock-lb5', date: subDays(new Date(), 5).toISOString(), activity: 'Pay monthly bills' },
             { id: 'log-mock-lb6', date: subDays(new Date(), 6).toISOString(), activity: 'Cleaned the apartment' },
             { id: 'log-mock-lb7', date: subDays(new Date(), 7).toISOString(), activity: 'Watched a movie' },
             { id: 'log-mock-lb8', date: subDays(new Date(), 8).toISOString(), activity: 'Client call' },
             { id: 'log-mock-lb9', date: subDays(new Date(), 9).toISOString(), activity: 'Yoga class' },
         ];
     }
    storedLogs.forEach(log => {
        const logDate = parseISO(log.date);
        if (isWithinInterval(logDate, { start: startDate, end: endDate })) {
            const category = categorizeActivity(log.activity);
            areaCounts[category]++;
        }
    });

    // 2. Completed Tasks (Assuming tasks have createdAt or dueDate, and status)
     // const storedTasksRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-tasks') : null;
     const storedTasksRaw = null;
     let storedTasks: Task[] = [];
      if (storedTasksRaw) {
         try { storedTasks = JSON.parse(storedTasksRaw).map((t: any) => ({...t, createdAt: t.createdAt ? parseISO(t.createdAt) : undefined})); } catch (e) { console.error("Error parsing tasks:", e); }
      } else {
          // Mock tasks if needed
          storedTasks = [
             { id: 'task-mock-lb1', title: 'Finalize Q3 report', status: 'Completed', createdAt: subDays(new Date(), 2).toISOString()},
             { id: 'task-mock-lb2', title: 'Schedule team sync', status: 'Completed', createdAt: subDays(new Date(), 1).toISOString()},
             { id: 'task-mock-lb3', title: 'Gym workout plan', status: 'In Progress', createdAt: subDays(new Date(), 3).toISOString()},
             { id: 'task-mock-lb4', title: 'Call family', status: 'Pending', createdAt: subDays(new Date(), 4).toISOString()},
          ];
      }
     storedTasks.forEach(task => {
         // Consider completed tasks or tasks worked on within the period
         const taskDate = task.createdAt ? parseISO(task.createdAt) : undefined; // Or use completion date if available
         if (task.status === 'Completed' && taskDate && isWithinInterval(taskDate, { start: startDate, end: endDate })) {
             const category = categorizeActivity(task.title);
             areaCounts[category]++;
         }
     });


    // 3. Calendar Events (Use mock or fetched data)
    // Note: Calendar events aren't stored locally in current setup. Using basic mock.
    const calendarEvents: CalendarEvent[] = [
        { title: 'Team Meeting', start: subDays(new Date(), 2).toISOString(), end: subDays(new Date(), 2).toISOString() },
        { title: 'Doctor Appointment', start: subDays(new Date(), 4).toISOString(), end: subDays(new Date(), 4).toISOString() },
    ];
    calendarEvents.forEach(event => {
        const eventDate = parseISO(event.start);
        if (isWithinInterval(eventDate, { start: startDate, end: endDate })) {
             const category = categorizeActivity(event.title);
             areaCounts[category]++;
        }
    });

    // 4. Notes (Could indicate focus areas)
     // const storedNotesRaw = typeof window !== 'undefined' ? window.localStorage.getItem('prodev-notes') : null;
     const storedNotesRaw = null;
     let storedNotes: { id: string, title: string, createdAt: string }[] = []; // Simplified Note type
     if (storedNotesRaw) {
          try { storedNotes = JSON.parse(storedNotesRaw).map((n: any) => ({...n, createdAt: parseISO(n.createdAt)})); } catch (e) { console.error("Error parsing notes:", e); }
     } // No mock notes needed for this simple count example

      storedNotes.forEach(note => {
          const noteDate = parseISO(note.createdAt);
          if (isWithinInterval(noteDate, { start: startDate, end: endDate })) {
              const category = categorizeActivity(note.title); // Categorize based on title
              areaCounts[category]++;
          }
      });

    return areaCounts;
};

// --- Input/Output Schemas ---
const AssessLifeBalanceInputSchema = z.object({
  // Optionally add date range if user should be able to select
  // startDate: z.string().datetime().optional(),
  // endDate: z.string().datetime().optional(),
}).describe("Input for assessing life balance. Currently analyzes the last 30 days by default.");
export type AssessLifeBalanceInput = z.infer<typeof AssessLifeBalanceInputSchema>;

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
    return assessLifeBalanceFlow(input);
}

// --- Prompt Definition ---
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
  typeof AssessLifeBalanceInputSchema,
  typeof AssessLifeBalanceOutputSchema
>({
  name: 'assessLifeBalanceFlow',
  inputSchema: AssessLifeBalanceInputSchema,
  outputSchema: AssessLifeBalanceOutputSchema,
}, async (input) => {
    // Define analysis period (e.g., last 30 days) - could be made configurable via input
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, 29)); // 30 days total
    const analysisPeriodDays = 30;

    // Load and categorize data
    const areaCounts = loadAndCategorizeData(startDate, endDate);

    // Calculate total activities (excluding Uncategorized for percentage calculation)
    const totalCategorizedActivities = LIFE_AREAS.reduce((sum, area) => sum + (areaCounts[area] || 0), 0);

    // Calculate percentage scores for each area
    const areaScores: z.infer<typeof AreaScoreSchema>[] = LIFE_AREAS.map(area => {
        const count = areaCounts[area] || 0;
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
    const promptInput: z.infer<typeof PromptInputSchema> = {
        areaCountsJson: JSON.stringify(areaCounts), // Pass the raw counts
        analysisPeriodDays: analysisPeriodDays,
    };

    const { output } = await assessLifeBalancePrompt(promptInput);

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
