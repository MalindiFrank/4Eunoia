
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { Smile, BookOpen, Headphones, Brain, Wind, Sun, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation'; 
import { formatISO, subDays, startOfDay, endOfDay } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
// useDataMode is no longer needed for checking mock mode here
// import { useDataMode } from '@/context/data-mode-context';
import { addGratitudeLog, getGratitudeLogs, addReframingLog, getReframingLogs, type GratitudeLog, type ReframingLog } from '@/services/wellness';
import { estimateBurnoutRisk, type EstimateBurnoutRiskInput, type EstimateBurnoutRiskOutput } from '@/ai/flows/estimate-burnout-risk';
import { getDailyLogs, type LogEntry } from '@/services/daily-log';
import { getTasks, type Task } from '@/services/task';
import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';

interface MoodLog {
  id: string;
  mood: string;
  notes?: string;
  timestamp: Date;
}

const WellnessPage: FC = () => {
  const { toast } = useToast();
  const router = useRouter();
  // const { dataMode } = useDataMode(); // No longer needed for mock/user checks here

  const [currentMood, setCurrentMood] = useState<string>('');
  const [moodNotes, setMoodNotes] = useState<string>('');
  const [journalEntry, setJournalEntry] = useState<string>('');
  const [focusSound, setFocusSound] = useState<string>('');
  const [activeRitualSound, setActiveRitualSound] = useState<string | null>(null);

  const [gratitudeText, setGratitudeText] = useState('');
  const [negativeThought, setNegativeThought] = useState('');
  const [positiveReframing, setPositiveReframing] = useState('');

  const [burnoutData, setBurnoutData] = useState<EstimateBurnoutRiskOutput | null>(null);
  const [isLoadingBurnout, setIsLoadingBurnout] = useState(true);

  const fetchBurnoutRisk = useCallback(async () => {
    setIsLoadingBurnout(true);
    try {
        const endDate = new Date();
        const startDate = subDays(endDate, 7); 

        const [logs, tasks, events] = await Promise.all([
            getDailyLogs().then(d => d.filter(l => l.date >= startDate && l.date <= endDate)),
            getTasks(), 
            getCalendarEvents().then(e => e.filter(ev => ev.start >= startDate && ev.start <= endDate)),
        ]);

        const formatForFlow = <T extends Record<string, any>>(items: T[] = [], dateKeys: (keyof T)[] = ['date', 'createdAt', 'updatedAt', 'start', 'end', 'dueDate']): any[] => {
          return items.map(item => {
              const newItem: Record<string, any> = { ...item };
              dateKeys.forEach(key => {
                  if (item[key] && item[key] instanceof Date) {
                      newItem[key] = formatISO(item[key]);
                  }
              });
              return newItem;
          });
      };

        const input: EstimateBurnoutRiskInput = {
            startDate: formatISO(startDate),
            endDate: formatISO(endDate),
            dailyLogs: formatForFlow(logs, ['date']),
            tasks: formatForFlow(tasks, ['createdAt', 'dueDate']),
            calendarEvents: formatForFlow(events, ['start', 'end']),
        };
        const result = await estimateBurnoutRisk(input);
        setBurnoutData(result);
    } catch (error) {
        console.error("Failed to estimate burnout risk:", error);
        toast({ title: "Error", description: "Could not load burnout risk data.", variant: "destructive" });
        setBurnoutData(null);
    } finally {
        setIsLoadingBurnout(false);
    }
  }, [toast]); // Removed dataMode from dependencies

  useEffect(() => {
    fetchBurnoutRisk();
  }, [fetchBurnoutRisk]);


  const handleLogMood = () => {
    if (!currentMood) {
        toast({ title: "Select Mood", description: "Please select your current mood.", variant: "destructive" });
        return;
    }
    console.log('Mood Logged:', { mood: currentMood, notes: moodNotes, timestamp: new Date() });
    toast({ title: "Mood Logged", description: `Logged feeling ${currentMood}. (Storage not implemented yet)` });
    setCurrentMood('');
    setMoodNotes('');
  };

  const handleSaveJournal = () => {
      if (!journalEntry.trim()) {
          toast({ title: "Empty Entry", description: "Journal entry cannot be empty.", variant: "destructive" });
          return;
      }
      console.log('Journal Saved:', journalEntry);
      toast({ title: "Journal Entry Saved", description: "Your thoughts have been recorded. (Storage not implemented yet)" });
      setJournalEntry('');
  };

  const startFocusRitual = () => {
      if (!focusSound || focusSound === 'none') {
           toast({ title: "Select Sound", description: "Please select a soundscape.", variant: "destructive" });
           return;
      }
      setActiveRitualSound(focusSound);
      console.log(`Starting focus ritual with ${focusSound} sound.`);
      toast({ title: "Focus Ritual Started", description: `Playing ${focusSound} soundscape.` });
  };

  const stopFocusRitual = () => {
      console.log(`Stopping focus ritual with ${activeRitualSound} sound.`);
      toast({ title: "Focus Ritual Stopped", description: `${activeRitualSound} soundscape stopped.` });
      setActiveRitualSound(null);
      setFocusSound(''); 
  };

  const getJournalPrompt = (): string => {
      const prompts = [
          "What are you grateful for today?",
          "Describe a recent challenge and how you navigated it.",
          "What brought you joy recently?",
          "If you could change one thing about your day, what would it be?",
          "What's one small step you can take towards a goal tomorrow?",
          "What's on your mind right now? No judgment, just write.",
          "Reflect on a recent interaction. How did it make you feel?",
          "What are you proud of accomplishing lately, big or small?"
      ];
      return prompts[Math.floor(Math.random() * prompts.length)];
  };

  const handleSaveGratitude = () => {
    if (!gratitudeText.trim()) {
        toast({ title: "Empty Gratitude", description: "Please list at least one thing.", variant: "destructive" });
        return;
    }
    addGratitudeLog({ text: gratitudeText, timestamp: new Date() });
    toast({ title: "Gratitude Saved", description: "Your gratitude has been recorded." });
    setGratitudeText('');
  };

  const handleLogReframing = () => {
    if (!negativeThought.trim() || !positiveReframing.trim()) {
        toast({ title: "Incomplete Reframing", description: "Please fill in both negative thought and positive reframing.", variant: "destructive" });
        return;
    }
    addReframingLog({ negativeThought, positiveReframing, timestamp: new Date() });
    toast({ title: "Reframing Logged", description: "Your reframing exercise has been saved." });
    setNegativeThought('');
    setPositiveReframing('');
  };

  const navigateToReflectionCoach = () => {
      router.push('/insights?tool=reflection');
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Smile className="h-8 w-8 text-primary" /> Wellness Center
      </h1>

      <Tabs defaultValue="mood" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mood">Mood Tracking</TabsTrigger>
          <TabsTrigger value="journal">Journaling</TabsTrigger>
          <TabsTrigger value="focus">Focus Rituals</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
        </TabsList>

        <TabsContent value="mood" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Log Your Mood</CardTitle>
              <CardDescription>Track how you're feeling throughout the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex flex-wrap gap-2">
                    {['😊 Happy', '😌 Calm', '😕 Neutral', '😟 Anxious', '😢 Sad', '😠 Stressed', '⚡ Productive', '😴 Tired'].map(moodEmoji => {
                        const mood = moodEmoji.split(' ')[1];
                        return (
                            <Button
                                key={mood}
                                variant={currentMood === mood ? "default" : "outline"}
                                onClick={() => setCurrentMood(mood)}
                                className="text-lg px-3 py-1.5 h-auto"
                            >
                                {moodEmoji}
                            </Button>
                        );
                     })}
               </div>
              <Textarea
                placeholder="Add any notes about why you feel this way (optional)"
                value={moodNotes}
                onChange={(e) => setMoodNotes(e.target.value)}
                rows={3}
              />
              <Button onClick={handleLogMood} disabled={!currentMood}>Log Mood</Button>
              <p className="text-sm text-muted-foreground italic mt-4">Past mood log visualization coming soon.</p>
            </CardContent>
          </Card>
           <Card className="mt-6 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700">
               <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">Burnout Risk Meter</CardTitle>
               </CardHeader>
               <CardContent>
                    {isLoadingBurnout ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-2 w-full" />
                            <Skeleton className="h-3 w-2/3 mt-1" />
                        </div>
                    ) : burnoutData ? (
                       <>
                           <div className="flex items-center justify-between gap-4 mb-1">
                               <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                   Risk Level: {burnoutData.riskLevel} ({burnoutData.riskScore}%)
                               </span>
                           </div>
                           <Progress value={burnoutData.riskScore} className="w-full h-2 bg-amber-200 [&>div]:bg-amber-500" />
                           <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">{burnoutData.assessmentSummary}</p>
                           {burnoutData.contributingFactors.length > 0 && (
                               <div className="mt-2">
                                   <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Factors:</p>
                                   <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-500">
                                       {burnoutData.contributingFactors.slice(0,2).map((factor, i) => <li key={i}>{factor}</li>)}
                                   </ul>
                               </div>
                           )}
                       </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Could not load burnout risk data.</p>
                    )}
                    <Button variant="link" size="sm" className="text-xs text-amber-700 dark:text-amber-400 p-0 h-auto mt-2" onClick={fetchBurnoutRisk} disabled={isLoadingBurnout}>
                        {isLoadingBurnout && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Refresh
                    </Button>
               </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Journal</CardTitle>
              <CardDescription>Reflect on your thoughts and experiences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="default" className="bg-primary/10">
                <BookOpen className="h-4 w-4" />
                <AlertTitle>Journal Prompt</AlertTitle>
                <AlertDescription>{getJournalPrompt()}</AlertDescription>
              </Alert>
              <Textarea
                placeholder="Start writing..."
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                rows={10}
              />
              <Button onClick={handleSaveJournal} disabled={!journalEntry.trim()}>Save Entry</Button>
              <p className="text-sm text-muted-foreground italic mt-4">Past journal entry display coming soon.</p>
            </CardContent>
          </Card>
           <Card className="mt-6">
               <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2">Weekly Reflection Coach</CardTitle>
                   <CardDescription>AI insights on your past week.</CardDescription>
               </CardHeader>
                <CardContent className="flex flex-col items-start gap-2">
                    <p className="text-sm text-muted-foreground italic">Engage in a guided reflection about your achievements, challenges, and patterns from the last 7 days.</p>
                    <Button onClick={navigateToReflectionCoach} variant="outline">
                        <Brain className="mr-2 h-4 w-4" /> Start Reflection
                    </Button>
                </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="focus" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Focus Rituals</CardTitle>
              <CardDescription>Prepare your mind for deep work with personalized routines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeRitualSound ? (
                <>
                  <Select value={focusSound} onValueChange={setFocusSound}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select a soundscape..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rain"><Wind className="inline-block mr-2 h-4 w-4" /> Gentle Rain</SelectItem>
                      <SelectItem value="forest"><Brain className="inline-block mr-2 h-4 w-4" /> Forest Ambience</SelectItem>
                      <SelectItem value="cafe"><Headphones className="inline-block mr-2 h-4 w-4" /> Coffee Shop Buzz</SelectItem>
                      <SelectItem value="ocean"><Sun className="inline-block mr-2 h-4 w-4" /> Ocean Waves</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={startFocusRitual} disabled={!focusSound || focusSound === 'none'}>Start Focus Ritual</Button>
                </>
              ) : (
                <div className="p-4 border rounded-lg bg-primary/10 text-center">
                    <p className="text-lg font-semibold text-primary">Focus Ritual Active</p>
                    <p className="text-muted-foreground mb-3">Playing: {activeRitualSound.charAt(0).toUpperCase() + activeRitualSound.slice(1)}</p>
                    <p className="text-2xl font-mono">24:59</p>
                    <Button onClick={stopFocusRitual} variant="destructive" className="mt-3">Stop Ritual</Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground italic mt-4">More focus tools (timers, breathing exercises) coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Micro-Therapy & Growth Exercises</CardTitle>
              <CardDescription>Short exercises based on CBT and positive psychology.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Gratitude Practice</h3>
                <p className="text-sm text-muted-foreground mb-3">List 3 things you are grateful for today.</p>
                <Textarea placeholder="1. ..." rows={3} value={gratitudeText} onChange={(e) => setGratitudeText(e.target.value)} />
                <Button size="sm" className="mt-2" onClick={handleSaveGratitude} disabled={!gratitudeText.trim()}>Save Gratitude</Button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Cognitive Reframing</h3>
                <p className="text-sm text-muted-foreground mb-1">Identify a negative thought:</p>
                 <Input placeholder="e.g., I'll never finish this project" value={negativeThought} onChange={(e) => setNegativeThought(e.target.value)} />
                 <p className="text-sm text-muted-foreground mt-3 mb-1">Reframe it positively:</p>
                 <Input placeholder="e.g., I can break it down and tackle one part." value={positiveReframing} onChange={(e) => setPositiveReframing(e.target.value)} />
                <Button size="sm" className="mt-2" onClick={handleLogReframing} disabled={!negativeThought.trim() || !positiveReframing.trim()}>Log Reframing</Button>
              </div>
               <p className="text-center text-muted-foreground text-sm pt-4">More exercises coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WellnessPage;
