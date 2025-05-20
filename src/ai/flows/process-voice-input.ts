
'use server';
/**
 * @fileOverview Processes transcribed voice input to categorize and extract information.
 *
 * - processVoiceInput - Analyzes text to determine user intent (log, task, note).
 * - ProcessVoiceInput - Input for the voice processing.
 * - ProcessedVoiceOutput - Output of the voice processing.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { formatISO, parseISO, isValid } from 'date-fns';

const ProcessVoiceInputSchema = z.object({
  transcribedText: z.string().min(1).describe('The text transcribed from user\'s voice input.'),
  currentDate: z.string().datetime().describe('The current date and time in ISO 8601 format, for context.'),
});
export type ProcessVoiceInput = z.infer<typeof ProcessVoiceInputSchema>;

const ExtractedDetailsSchema = z.object({
    title: z.string().optional().describe('Extracted title for a task or note, or main activity for a log.'),
    description: z.string().optional().describe('Extracted description for a task, or part of content for a note/log.'),
    content: z.string().optional().describe('Extracted main content for a note. Could also be used for detailed diary part of a log.'),
    date: z.string().datetime().optional().describe('Extracted date for a log (ISO 8601 format). Default to current if not specified.'),
    dueDate: z.string().datetime().optional().describe('Extracted due date for a task (ISO 8601 format).'),
    mood: z.string().optional().describe("Extracted mood for a log entry (e.g., 'Happy', 'Stressed')."),
    focusLevel: z.number().min(1).max(5).optional().describe("Extracted focus level (1-5) for a log entry."),
});

const ProcessedVoiceOutputSchema = z.object({
  intent: z.enum(['log_activity', 'create_task', 'create_note', 'general_query', 'unclear'])
    .describe('The classified intent of the voice input.'),
  extractedDetails: ExtractedDetailsSchema.optional().describe('Details extracted based on the intent.'),
  responseText: z.string().describe('A text response to the user, confirming understanding or asking for clarification.'),
});
export type ProcessedVoiceOutput = z.infer<typeof ProcessedVoiceOutputSchema>;

export async function processVoiceInput(
  input: ProcessVoiceInput
): Promise<ProcessedVoiceOutput> {
  return processVoiceInputFlow(input);
}

const processVoiceInputPrompt = ai.definePrompt({
  name: 'processVoiceInputPrompt',
  input: { schema: ProcessVoiceInputSchema },
  output: { schema: ProcessedVoiceOutputSchema },
  prompt: `You are an AI assistant for the 4Eunoia app, helping a user manage their productivity and personal development via voice.
The user has spoken, and their speech has been transcribed to: "{{transcribedText}}".
The current date and time is: {{currentDate}}.

Your tasks:
1.  **Determine Intent**: Classify the user's intent. Is it to:
    *   'log_activity': Log something they did or are doing (e.g., "I just finished a workout", "Log that I worked on the report for 2 hours with high focus", "Diary entry: Feeling great today after a productive morning").
    *   'create_task': Create a new task or to-do item (e.g., "Remind me to buy groceries tomorrow", "Add 'call John by 5 PM' to my tasks", "New task: Plan weekend trip, due next Friday").
    *   'create_note': Create a general note (e.g., "Note that the project deadline is next Friday", "Idea: new marketing strategy about X and Y").
    *   'general_query': Ask a question or make a general statement not fitting other categories (e.g., "What's the weather like?", "Tell me a joke").
    *   'unclear': If the intent cannot be reasonably determined.
2.  **Extract Details (if applicable)**:
    *   For 'log_activity':
        *   'title': The main activity (e.g., "Workout", "Worked on report").
        *   'date': Infer if mentioned (e.g., "yesterday", "this morning"), default to {{currentDate}} if not.
        *   'mood': Infer if mentioned (e.g., "feeling great", "stressed").
        *   'focusLevel': Infer if mentioned (e.g., "high focus" -> 5, "distracted" -> 2).
        *   'description': Brief details or notes related to the activity.
        *   'content': Longer, more reflective parts that could be a diary entry.
    *   For 'create_task':
        *   'title': Task name (e.g., "Buy groceries", "Call John").
        *   'description': Additional details for the task.
        *   'dueDate': Infer due date if mentioned (e.g., "tomorrow", "next Friday", "by 5 PM today"), default to {{currentDate}} if a time like "today" or specific time is mentioned.
    *   For 'create_note':
        *   'title': If a clear subject is stated (e.g., "Note about project X"). If not, try to derive from the first few meaningful words of the content.
        *   'content': The main body/content of the note.
3.  **Formulate ResponseText**:
    *   If intent is clear and *sufficient* details for an action (log, task, note) are extracted: Confirm the action and key details (e.g., "Okay, logging '[activity title]' for today.", "Got it, adding task: '[task title]' for [date if specified].", "Noted: '[note title]'.").
    *   If intent is clear but essential details are missing for an action: Ask for clarification (e.g., "Sure, I can log an activity. What did you do?", "What should I call this task?", "What's the content of the note?").
    *   If intent is 'general_query': Acknowledge and state you'll try to help (e.g., "I can try to answer that..."). Actual query processing is out of scope for this flow.
    *   If intent is 'unclear': Politely say you didn't understand and ask them to rephrase (e.g., "Sorry, I didn't quite catch that. Could you please rephrase?").

Consider common phrasing. For tasks, "remind me to..." or "add to tasks..." are common. For logs, past tense is common.
Focus on extracting structured data for 'title', 'date', 'dueDate', 'mood', 'focusLevel', 'description', 'content'.
If a date is "today" or a time like "5 PM" is mentioned without a day for a task, assume it's for {{currentDate}}.

Output the result in the specified JSON format.
`,
});

const processVoiceInputFlow = ai.defineFlow<
  typeof ProcessVoiceInputSchema,
  typeof ProcessedVoiceOutputSchema
>({
  name: 'processVoiceInputFlow',
  inputSchema: ProcessVoiceInputSchema,
  outputSchema: ProcessedVoiceOutputSchema,
}, async (input) => {
  if (!input.transcribedText.trim()) {
    return {
      intent: 'unclear',
      responseText: 'I didn\'t hear anything. Please try speaking again.',
    };
  }

  try {
    const { output } = await processVoiceInputPrompt(input);
    if (!output) {
      console.error('AI voice processing failed to return output.');
      return {
        intent: 'unclear',
        responseText: "I'm having a little trouble understanding right now. Please try again.",
      };
    }
    
    // Ensure extractedDetails.date defaults to currentDate if intent is log_activity or create_task and no date was extracted.
    if (output.intent === 'log_activity' || output.intent === 'create_task') {
        let effectiveDate = input.currentDate; // Default to current date

        // If a dueDate is extracted, try to parse it. If it's just a time, combine with currentDate.
        if (output.extractedDetails?.dueDate) {
            try {
                const parsedDueDate = parseISO(output.extractedDetails.dueDate);
                if (isValid(parsedDueDate)) {
                    // If dueDate is a full date, use it. If it's just a time, it implies today.
                     // The prompt already guides the AI to set dueDate to `currentDate` if only a time is mentioned.
                    effectiveDate = output.extractedDetails.dueDate;
                }
            } catch (e) { /* ignore parsing error, stick with currentDate */ }
        } else if (output.extractedDetails?.date) {
             try {
                const parsedDate = parseISO(output.extractedDetails.date);
                if (isValid(parsedDate)) {
                    effectiveDate = output.extractedDetails.date;
                }
            } catch (e) { /* ignore parsing error, stick with currentDate */ }
        }
        
        if (output.extractedDetails) {
             if (output.intent === 'log_activity' && !output.extractedDetails.date) {
                output.extractedDetails.date = effectiveDate;
            }
            // For create_task, dueDate is the primary date field if present and valid.
            // The AI prompt already handles setting dueDate to `currentDate` if only a time is mentioned.
            // If AI doesn't extract a dueDate but extracts a generic 'date', we could use it for dueDate.
            if (output.intent === 'create_task' && !output.extractedDetails.dueDate && output.extractedDetails.date) {
                 output.extractedDetails.dueDate = output.extractedDetails.date;
                 delete output.extractedDetails.date; // Avoid confusion
            } else if (output.intent === 'create_task' && !output.extractedDetails.dueDate && !output.extractedDetails.date) {
                 // if no date or dueDate is extracted for a task, we might not want to default it.
                 // Or, if we want a default dueDate, it would be here.
                 // For now, let's assume AI handles this based on prompt "default to {{currentDate}} if a time like 'today'..."
            }

        } else {
            // If extractedDetails is undefined, create it
            if (output.intent === 'log_activity') {
                 output.extractedDetails = { date: effectiveDate };
            } else if (output.intent === 'create_task') {
                 output.extractedDetails = { dueDate: effectiveDate };
            }
        }
    }
    return output;
  } catch (error) {
    console.error('Error in processVoiceInputFlow:', error);
    return {
      intent: 'unclear',
      responseText: "There was an issue processing your voice input. Please try again.",
    };
  }
});
