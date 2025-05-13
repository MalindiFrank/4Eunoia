'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Link as LinkIcon, Brain, User, Palette, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useDataMode } from '@/context/data-mode-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Placeholder types for settings
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultView: string; // e.g., '/', '/tasks'
}

interface NotificationSettings {
  taskReminders: boolean;
  eventAlerts: boolean;
  habitNudges: boolean;
  insightNotifications: boolean;
}

interface IntegrationSettings {
  googleCalendarSync: boolean;
  slackIntegration: boolean;
}

interface NeurodivergentSettings {
  enabled: boolean;
  focusModeTimer: 'pomodoro' | 'custom';
  taskChunking: boolean;
  lowStimulationUI: boolean;
}

const SETTINGS_STORAGE_KEY = '4eunoia-app-settings'; // Updated key

const SettingsPage: FC = () => {
  const { toast } = useToast();
  const { resetToMockMode } = useDataMode();

  // Initialize state with default values
  const [preferences, setPreferences] = useState<UserPreferences>({ theme: 'system', defaultView: '/' });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    taskReminders: true,
    eventAlerts: true,
    habitNudges: true,
    insightNotifications: true,
  });
  const [integrations, setIntegrations] = useState<IntegrationSettings>({ googleCalendarSync: false, slackIntegration: false });
  const [neurodivergent, setNeurodivergent] = useState<NeurodivergentSettings>({
    enabled: false,
    focusModeTimer: 'pomodoro',
    taskChunking: false,
    lowStimulationUI: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Function to apply the theme based on preferences
  const applyTheme = (theme: UserPreferences['theme']) => {
     if (typeof window === 'undefined') return;
     const root = window.document.documentElement;
     root.classList.remove('light', 'dark');

     if (theme === 'system') {
       const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
       root.classList.add(systemTheme);
       return;
     }
     root.classList.add(theme);
   };

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      let loadedPreferences = preferences; // Use defaults initially
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          loadedPreferences = { ...preferences, ...(parsedSettings.preferences || {}) }; // Load saved preferences
          setPreferences(loadedPreferences);
          setNotifications(prev => ({ ...prev, ...(parsedSettings.notifications || {}) }));
          setIntegrations(prev => ({ ...prev, ...(parsedSettings.integrations || {}) }));
          setNeurodivergent(prev => ({ ...prev, ...(parsedSettings.neurodivergent || {}) }));
        } catch (e) {
          console.error("Error loading settings from localStorage:", e);
          toast({ title: "Error", description: "Could not load saved settings.", variant: "destructive" });
        }
      }
      applyTheme(loadedPreferences.theme); // Apply loaded or default theme
      setIsLoading(false);
    }
  }, [toast]); // Only run once on mount

   // Effect to apply theme when preferences change
   useEffect(() => {
     applyTheme(preferences.theme);
   }, [preferences.theme]);

  // Function to save all settings to localStorage
  const saveSettings = () => {
     if (typeof window === 'undefined') return;
     const allSettings = {
         preferences,
         notifications,
         integrations,
         neurodivergent,
     };
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(allSettings));
        applyTheme(preferences.theme); // Re-apply theme immediately after save
        toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    } catch (e) {
        console.error("Error saving settings to localStorage:", e);
        toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
    }
  };

  // Handlers for individual setting changes (using functional updates)
  const handlePreferenceChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleNotificationChange = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
      setNotifications(prev => ({ ...prev, [key]: value }));
  };

   const handleIntegrationChange = <K extends keyof IntegrationSettings>(key: K, value: IntegrationSettings[K]) => {
        setIntegrations(prev => ({ ...prev, [key]: value }));
        if (key === 'googleCalendarSync') {
             toast({ title: "Google Calendar Sync", description: value ? "Connect your Google Calendar (feature coming soon)." : "Google Calendar sync disabled.", variant: "default"});
        }
        if (key === 'slackIntegration') {
             toast({ title: "Slack Integration", description: value ? "Connect your Slack (feature coming soon)." : "Slack integration disabled.", variant: "default"});
        }
   };

   const handleNeurodivergentChange = <K extends keyof NeurodivergentSettings>(key: K, value: NeurodivergentSettings[K]) => {
        setNeurodivergent(prev => ({ ...prev, [key]: value }));
   };

   // Reset handler
   const handleResetApp = () => {
        // Clear all settings from state and local storage
        setPreferences({ theme: 'system', defaultView: '/' });
        setNotifications({ taskReminders: true, eventAlerts: true, habitNudges: true, insightNotifications: true });
        setIntegrations({ googleCalendarSync: false, slackIntegration: false });
        setNeurodivergent({ enabled: false, focusModeTimer: 'pomodoro', taskChunking: false, lowStimulationUI: false });
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
        }
        applyTheme('system'); // Reset theme visually

        // Reset data mode (this also clears service-specific local storage and reloads)
        resetToMockMode(); 
        toast({ title: "Application Reset", description: "All data and settings have been cleared. The app has been reset to mock data mode.", duration: 5000 });
   }


  if (isLoading) {
      return <div className="container mx-auto p-4 md:p-6 lg:p-8"><p>Loading settings...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Settings className="h-8 w-8 text-primary" /> Application Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Preferences</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-select">Theme</Label>
            <Select value={preferences.theme} onValueChange={(value: UserPreferences['theme']) => handlePreferenceChange('theme', value)}>
              <SelectTrigger id="theme-select" className="w-[180px]" aria-label="Select application theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
          <CardDescription>Manage how and when you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-reminders">Task Due Date Reminders</Label>
            <Switch
              id="task-reminders"
              checked={notifications.taskReminders}
              onCheckedChange={(checked) => handleNotificationChange('taskReminders', checked)}
              aria-label="Toggle task due date reminders"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="event-alerts">Calendar Event Alerts</Label>
            <Switch
              id="event-alerts"
              checked={notifications.eventAlerts}
              onCheckedChange={(checked) => handleNotificationChange('eventAlerts', checked)}
              aria-label="Toggle calendar event alerts"
            />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="habit-nudges">Habit Nudges & Reminders</Label>
              <Switch
                id="habit-nudges"
                checked={notifications.habitNudges}
                onCheckedChange={(checked) => handleNotificationChange('habitNudges', checked)}
                aria-label="Toggle habit nudges and reminders"
              />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="insight-notifications">New Insight Notifications</Label>
              <Switch
                id="insight-notifications"
                checked={notifications.insightNotifications}
                onCheckedChange={(checked) => handleNotificationChange('insightNotifications', checked)}
                aria-label="Toggle new insight notifications"
              />
          </div>
        </CardContent>
      </Card>

       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Integrations</CardTitle>
           <CardDescription>Connect 4Eunoia with other services.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                    <Label htmlFor="google-calendar-sync" className="font-medium">Google Calendar Sync</Label>
                    <p className="text-xs text-muted-foreground">Sync events between 4Eunoia and Google Calendar.</p>
                </div>
                <Switch
                 id="google-calendar-sync"
                 checked={integrations.googleCalendarSync}
                 onCheckedChange={(checked) => handleIntegrationChange('googleCalendarSync', checked)}
                 aria-label="Toggle Google Calendar sync"
                />
           </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
                 <div>
                     <Label htmlFor="slack-sync" className="font-medium">Slack Integration</Label>
                     <p className="text-xs text-muted-foreground">Get reminders and updates in Slack.</p>
                 </div>
                 <Switch 
                    id="slack-sync" 
                    checked={integrations.slackIntegration}
                    onCheckedChange={(checked) => handleIntegrationChange('slackIntegration', checked)}
                    aria-label="Toggle Slack integration"
                 />
            </div>
         </CardContent>
       </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Neurodivergent Mode</CardTitle>
          <CardDescription>Customize features for ADHD, anxiety, or burnout sensitivity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
              <Label htmlFor="neurodivergent-enable" className="font-medium">Enable Neurodivergent Mode</Label>
              <Switch
                id="neurodivergent-enable"
                checked={neurodivergent.enabled}
                onCheckedChange={(checked) => handleNeurodivergentChange('enabled', checked)}
                aria-label="Enable Neurodivergent Mode"
              />
           </div>
            {neurodivergent.enabled && (
                <>
                    <Separator />
                    <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                         <div className="flex items-center justify-between">
                            <Label htmlFor="task-chunking">Enable Task Chunking Suggestions</Label>
                            <Switch
                             id="task-chunking"
                             checked={neurodivergent.taskChunking}
                             onCheckedChange={(checked) => handleNeurodivergentChange('taskChunking', checked)}
                             aria-label="Enable task chunking suggestions"
                            />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="low-stimulation">Use Low Stimulation UI</Label>
                            <Switch
                             id="low-stimulation"
                             checked={neurodivergent.lowStimulationUI}
                             onCheckedChange={(checked) => handleNeurodivergentChange('lowStimulationUI', checked)}
                             aria-label="Use low stimulation UI"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="focus-timer">Focus Mode Timer Style</Label>
                            <Select value={neurodivergent.focusModeTimer} onValueChange={(value: NeurodivergentSettings['focusModeTimer']) => handleNeurodivergentChange('focusModeTimer', value)}>
                              <SelectTrigger id="focus-timer" className="w-[180px]" aria-label="Select focus mode timer style">
                                <SelectValue placeholder="Select timer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pomodoro">Pomodoro (25/5)</SelectItem>
                                <SelectItem value="custom">Custom (Set in Focus)</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    </div>
                </>
            )}

        </CardContent>
      </Card>

      <Card className="border-destructive">
         <CardHeader>
             <CardTitle className="flex items-center gap-2 text-destructive"><Trash className="h-5 w-5" /> Reset Application</CardTitle>
             <CardDescription className="text-destructive/90">This action will permanently delete all your saved data (tasks, logs, expenses, etc.) and reset the app to its initial state using mock data. Your settings will also be reset.</CardDescription>
         </CardHeader>
         <CardContent>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash className="mr-2 h-4 w-4" /> Clear All My Data & Reset</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All your personal data stored in this browser will be deleted permanently. The application will switch back to using mock data. Settings will also be reset.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetApp} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                            Yes, Delete Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
         </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings}>Save All Settings</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
