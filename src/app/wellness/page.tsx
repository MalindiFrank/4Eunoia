'use client';

import type { FC } from 'react';
import React, { useState } from 'react';
import { Smile, BookOpen, Headphones, Brain, Wind, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Placeholder types - Replace with actual data structures later
interface MoodLog {
  id: string;
  mood: string; // e.g., Happy, Sad, Anxious, Calm, Productive, Tired
  notes?: string;
  timestamp: Date;
}

const WellnessPage: FC = () => {
  const { toast } = useToast();
  const [currentMood, setCurrentMood] = useState<string>('');
  const [moodNotes, setMoodNotes] = useState<string>('');
  const [journalEntry, setJournalEntry] = useState<string>('');
  const [focusSound, setFocusSound] = useState<string>(''); // e.g., 'rain', 'cafe', 'forest'

  // TODO: Implement data fetching/saving for mood logs, journal entries, etc. (e.g., using localStorage or backend)

  const handleLogMood = () => {
    if (!currentMood) {
        toast({ title: "Select Mood", description: "Please select your current mood.", variant: "destructive" });
        return;
    }
    const newLog: MoodLog = {
        id: crypto.randomUUID(),
        mood: currentMood,
        notes: moodNotes,
        timestamp: new Date(),
    };
    // TODO: Save newLog
    console.log('Mood Logged:', newLog);
    toast({ title: "Mood Logged", description: `Logged feeling ${currentMood}.` });
    setCurrentMood('');
    setMoodNotes('');
  };

  const handleSaveJournal = () => {
      if (!journalEntry.trim()) {
          toast({ title: "Empty Entry", description: "Journal entry cannot be empty.", variant: "destructive" });
          return;
      }
      // TODO: Save journalEntry with timestamp
      console.log('Journal Saved:', journalEntry);
      toast({ title: "Journal Entry Saved", description: "Your thoughts have been recorded." });
      setJournalEntry(''); // Clear after saving
  };

  const startFocusRitual = () => {
      // TODO: Implement focus ritual logic (e.g., play sound, start timer)
      if (!focusSound) {
           toast({ title: "Select Sound", description: "Please select a soundscape.", variant: "destructive" });
           return;
      }
      console.log(`Starting focus ritual with ${focusSound} sound.`);
      toast({ title: "Focus Ritual Started", description: `Playing ${focusSound} soundscape.` });
  };

  const getJournalPrompt = (): string => {
      // TODO: Implement more sophisticated prompt generation (AI or predefined list)
      const prompts = [
          "What are you grateful for today?",
          "Describe a recent challenge and how you navigated it.",
          "What brought you joy recently?",
          "If you could change one thing about your day, what would it be?",
          "What's one small step you can take towards a goal tomorrow?",
      ];
      return prompts[Math.floor(Math.random() * prompts.length)];
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

        {/* Mood Tracking Tab */}
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
                                className="text-lg px-3 py-1.5 h-auto" // Adjust size for emojis
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
              {/* TODO: Add visualization of past mood logs */}
            </CardContent>
          </Card>
           {/* Add Burnout Risk Meter Placeholder */}
           <Card className="mt-6 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700">
               <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">Burnout Risk Meter</CardTitle>
               </CardHeader>
               <CardContent>
                    {/* TODO: Replace with actual meter component and AI calculation */}
                   <div className="flex items-center justify-center gap-4">
                        <Progress value={35} className="w-full h-2 bg-amber-200 [&>div]:bg-amber-500" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Low Risk (35%)</span>
                   </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Based on recent activity, mood logs, and task load.</p>
               </CardContent>
           </Card>
        </TabsContent>

        {/* Journaling Tab */}
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
              {/* TODO: Display past journal entries */}
            </CardContent>
          </Card>
           {/* AI Reflection Coach Placeholder */}
           <Card className="mt-6">
               <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2">Weekly Reflection Coach</CardTitle>
                   <CardDescription>AI insights on your past week (coming soon).</CardDescription>
               </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground italic">Engage in a guided reflection about your achievements, challenges, and patterns from the last 7 days.</p>
                    {/* TODO: Implement AI reflection flow */}
                </CardContent>
           </Card>
        </TabsContent>

        {/* Focus Rituals Tab */}
        <TabsContent value="focus" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Focus Rituals</CardTitle>
              <CardDescription>Prepare your mind for deep work with personalized routines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {/* TODO: Add options for breathing exercises, timers, etc. */}
              <Button onClick={startFocusRitual} disabled={!focusSound || focusSound === 'none'}>Start Focus Ritual</Button>
              {/* Placeholder for active ritual state */}
              {/* <p className="text-sm text-muted-foreground">Focus ritual active...</p> */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exercises Tab */}
        <TabsContent value="exercises" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Micro-Therapy & Growth Exercises</CardTitle>
              <CardDescription>Short exercises based on CBT and positive psychology.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Placeholder - Replace with actual interactive exercises */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Gratitude Practice</h3>
                <p className="text-sm text-muted-foreground mb-3">List 3 things you are grateful for today.</p>
                <Textarea placeholder="1. ..." rows={3} />
                <Button size="sm" className="mt-2">Save Gratitude</Button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Cognitive Reframing</h3>
                <p className="text-sm text-muted-foreground mb-1">Identify a negative thought:</p>
                 <Input placeholder="e.g., I'll never finish this project" />
                 <p className="text-sm text-muted-foreground mt-3 mb-1">Reframe it positively:</p>
                 <Input placeholder="e.g., I can break it down and tackle one part." />
                <Button size="sm" className="mt-2">Log Reframing</Button>
              </div>
               {/* Add more exercise types: Affirmations, Goal Visualization, etc. */}
               <p className="text-center text-muted-foreground text-sm pt-4">More exercises coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WellnessPage;
