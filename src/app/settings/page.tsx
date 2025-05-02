
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Link as LinkIcon, Brain, User, Palette, Trash } from 'lucide-react'; // Added Trash icon

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'; // Added AlertDialog
import { cn } from '@/lib/utils'; // Added cn

// Placeholder types for settings
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultView: string; // e.g., '/dashboard', '/tasks'
}

interface NotificationSettings {
  taskReminders: boolean;
  eventAlerts: boolean;
  habitNudges: boolean;
  insightNotifications: boolean;
}

interface IntegrationSettings {
  googleCalendarSync: boolean;
  // Add other potential integrations (Slack, etc.)
}

interface NeurodivergentSettings {
  enabled: boolean;
  focusModeTimer: 'pomodoro' | 'custom'; // Example setting
  taskChunking: boolean;
  lowStimulationUI: boolean;
}

const SETTINGS_STORAGE_KEY = 'prodev-app-settings';

const SettingsPage: FC = () => {
  const { toast } = useToast();
  const { resetToMockMode } = useDataMode(); // Get the reset function

  // Initialize state with default values
  const [preferences, setPreferences] = useState<UserPreferences>({ theme: 'system', defaultView: '/' });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    taskReminders: true,
    eventAlerts: true,
    habitNudges: true,
    insightNotifications: true,
  });
  const [integrations, setIntegrations] = useState<IntegrationSettings>({ googleCalendarSync: false });
  const [neurodivergent, setNeurodivergent] = useState<NeurodivergentSettings>({
    enabled: false,
    focusModeTimer: 'pomodoro',
    taskChunking: false,
    lowStimulationUI: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          // Merge loaded settings with defaults to handle missing keys
          setPreferences(prev => ({ ...prev, ...(parsedSettings.preferences || {}) }));
          setNotifications(prev => ({ ...prev, ...(parsedSettings.notifications || {}) }));
          setIntegrations(prev => ({ ...prev, ...(parsedSettings.integrations || {}) }));
          setNeurodivergent(prev => ({ ...prev, ...(parsedSettings.neurodivergent || {}) }));
        } catch (e) {
          console.error("Error loading settings from localStorage:", e);
          toast({ title: "Error", description: "Could not load saved settings.", variant: "destructive" });
        }
      }
      setIsLoading(false);
    }
  }, [toast]);

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
        // Add specific logic for enabling/disabling integrations (e.g., auth flow)
        if (key === 'googleCalendarSync' && value) {
             toast({ title: "Integration Action Needed", description: "Connect your Google Calendar (feature not implemented).", variant: "default"});
        }
   };

   const handleNeurodivergentChange = <K extends keyof NeurodivergentSettings>(key: K, value: NeurodivergentSettings[K]) => {
        setNeurodivergent(prev => ({ ...prev, [key]: value }));
   };

   // Reset handler
   const handleResetApp = () => {
        resetToMockMode();
        // Optionally reset local settings state as well, or rely on page reload triggered by context change
        setPreferences({ theme: 'system', defaultView: '/' });
        setNotifications({ taskReminders: true, eventAlerts: true, habitNudges: true, insightNotifications: true });
        setIntegrations({ googleCalendarSync: false });
        setNeurodivergent({ enabled: false, focusModeTimer: 'pomodoro', taskChunking: false, lowStimulationUI: false });
        toast({ title: "Application Reset", description: "All your data has been cleared. Switched back to Mock Data mode.", variant: "destructive" });
        // Consider window.location.reload() if state changes aren't fully reflected
   }


  if (isLoading) {
     // Basic loading state, replace with skeletons if needed
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
              <SelectTrigger id="theme-select" className="w-[180px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
           {/* Add more preferences like default startup page, language, etc. */}
           {/* <div className="flex items-center justify-between">
               <Label htmlFor="default-view-select">Default Startup Page</Label>
               <Select value={preferences.defaultView} onValueChange={(value) => handlePreferenceChange('defaultView', value)}>
                 <SelectTrigger id="default-view-select" className="w-[180px]">
                     <SelectValue placeholder="Select page" />
                 </SelectTrigger>
                 <SelectContent>
                     <SelectItem value="/">Dashboard</SelectItem>
                     <SelectItem value="/tasks">Tasks</SelectItem>
                     <SelectItem value="/calendar">Calendar</SelectItem>
                     {/* Add other pages */}
                {/* </SelectContent>
               </Select>
           </div> */}
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
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="event-alerts">Calendar Event Alerts</Label>
            <Switch
              id="event-alerts"
              checked={notifications.eventAlerts}
              onCheckedChange={(checked) => handleNotificationChange('eventAlerts', checked)}
            />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="habit-nudges">Habit Nudges & Reminders</Label>
              <Switch
                id="habit-nudges"
                checked={notifications.habitNudges}
                onCheckedChange={(checked) => handleNotificationChange('habitNudges', checked)}
              />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="insight-notifications">New Insight Notifications</Label>
              <Switch
                id="insight-notifications"
                checked={notifications.insightNotifications}
                onCheckedChange={(checked) => handleNotificationChange('insightNotifications', checked)}
              />
          </div>
           {/* Add more notification options: frequency, quiet hours, etc. */}
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
                />
           </div>
            {/* Add placeholders for other integrations like Slack, Outlook Calendar, etc. */}
            <div className="flex items-center justify-between p-3 border rounded-lg opacity-50 cursor-not-allowed">
                 <div>
                     <Label htmlFor="slack-sync" className="font-medium">Slack Integration</Label>
                     <p className="text-xs text-muted-foreground">Get reminders and updates in Slack (coming soon).</p>
                 </div>
                 <Switch id="slack-sync" disabled />
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
                            />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="low-stimulation">Use Low Stimulation UI</Label>
                            <Switch
                             id="low-stimulation"
                             checked={neurodivergent.lowStimulationUI}
                             onCheckedChange={(checked) => handleNeurodivergentChange('lowStimulationUI', checked)}
                            />
                        </div>
                        {/* Add Focus Timer options */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="focus-timer">Focus Mode Timer Style</Label>
                            <Select value={neurodivergent.focusModeTimer} onValueChange={(value: NeurodivergentSettings['focusModeTimer']) => handleNeurodivergentChange('focusModeTimer', value)}>
                              <SelectTrigger id="focus-timer" className="w-[180px]">
                                <SelectValue placeholder="Select timer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pomodoro">Pomodoro (25/5)</SelectItem>
                                <SelectItem value="custom">Custom (Set in Focus)</SelectItem>
                                {/* Add other timer styles */}
                              </SelectContent>
                            </Select>
                        </div>
                        {/* Add Soundscape options link */}
                    </div>
                </>
            )}

        </CardContent>
      </Card>

      {/* Reset Section */}
      <Card className="border-destructive">
         <CardHeader>
             <CardTitle className="flex items-center gap-2 text-destructive"><Trash className="h-5 w-5" /> Reset Application</CardTitle>
             <CardDescription className="text-destructive/90">This action will permanently delete all your saved data (tasks, logs, expenses, etc.) and reset the app to its initial state using mock data.</CardDescription>
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
                            This action cannot be undone. All your personal data stored in this browser will be deleted permanently. The application will switch back to using mock data.
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings}>Save All Settings</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
