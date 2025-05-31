
// src/app/settings/page.tsx
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Link as LinkIcon, Brain, User, Palette, Trash, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label }
from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { applyTheme, getInitialTheme, SETTINGS_STORAGE_KEY, type Theme } from '@/lib/theme-utils';
import { Input } from '@/components/ui/input';


type GrowthPace = 'Slow' | 'Moderate' | 'Aggressive';
type AIPersona = 'Supportive Coach' | 'Neutral Assistant' | 'Direct Analyst';
type AIInsightVerbosity = 'Brief Summary' | 'Detailed Analysis';
type PreferredWorkTimes = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';


interface UserPreferences {
  theme: Theme;
  defaultView: string; 
  growthPace: GrowthPace;
  aiPersona: AIPersona;
  aiInsightVerbosity: AIInsightVerbosity;
  energyPattern: string; 
  preferredWorkTimes: PreferredWorkTimes;
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
  focusShieldEnabled: boolean; 
}

const SettingsPage: FC = () => {
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light', // Default to light
    defaultView: '/',
    growthPace: 'Moderate',
    aiPersona: 'Supportive Coach',
    aiInsightVerbosity: 'Detailed Analysis',
    energyPattern: 'Steady throughout day',
    preferredWorkTimes: 'Flexible',
  });
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
    focusShieldEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          const validThemes: Theme[] = ['light', 'dark', 'system'];
          const loadedTheme = parsedSettings?.preferences?.theme && validThemes.includes(parsedSettings.preferences.theme)
            ? parsedSettings.preferences.theme
            : getInitialTheme(); // Use getInitialTheme to ensure a valid default

          setPreferences(prev => ({
            ...prev,
            ...(parsedSettings.preferences || {}),
            theme: loadedTheme,
            aiPersona: parsedSettings.preferences?.aiPersona || 'Supportive Coach',
            aiInsightVerbosity: parsedSettings.preferences?.aiInsightVerbosity || 'Detailed Analysis',
            energyPattern: parsedSettings.preferences?.energyPattern || 'Steady throughout day',
            preferredWorkTimes: parsedSettings.preferences?.preferredWorkTimes || 'Flexible',
          }));
          setNotifications(prev => ({ ...prev, ...(parsedSettings.notifications || {}) }));
          setIntegrations(prev => ({ ...prev, ...(parsedSettings.integrations || {}) }));
          setNeurodivergent(prev => ({
             ...prev,
             ...(parsedSettings.neurodivergent || {}),
             focusShieldEnabled: parsedSettings.neurodivergent?.focusShieldEnabled || false,
            }));
          applyTheme(loadedTheme); // Apply loaded theme
        } catch (e) {
          console.error("Error loading settings from localStorage:", e);
          toast({ title: "Error", description: "Could not load saved settings.", variant: "destructive" });
          applyTheme(getInitialTheme()); // Apply default theme on error
        }
      } else {
        applyTheme(getInitialTheme()); // Apply default if no settings stored
      }
      setIsLoading(false);
    }
  }, [toast]);

  const saveSpecificSetting = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
        const currentSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
        const updatedSettings = { ...currentSettings, [key]: value };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
        toast({ title: "Setting Saved", description: "Your preference has been updated." });
    } catch (e) {
        console.error("Error saving setting:", e);
        toast({ title: "Error", description: "Could not save setting.", variant: "destructive" });
    }
  };


  const handlePreferenceChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      if (key === 'theme') {
          applyTheme(value as Theme);
      }
      saveSpecificSetting('preferences', newPreferences);
  };

  const handleNotificationChange = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
      const newNotifications = { ...notifications, [key]: value };
      setNotifications(newNotifications);
      saveSpecificSetting('notifications', newNotifications);
  };

   const handleIntegrationChange = <K extends keyof IntegrationSettings>(key: K, value: IntegrationSettings[K]) => {
        const newIntegrations = { ...integrations, [key]: value };
        setIntegrations(newIntegrations);
        saveSpecificSetting('integrations', newIntegrations);
        if (value) { 
          const integrationName = key === 'googleCalendarSync' ? 'Google Calendar Sync' : 'Slack Integration';
          toast({ title: `${integrationName} (Coming Soon)`, description: `Connect your ${integrationName.split(' ')[0]} (feature in development).`, variant: "default"});
        }
   };

   const handleNeurodivergentChange = <K extends keyof NeurodivergentSettings>(key: K, value: NeurodivergentSettings[K]) => {
        const newNeurodivergent = { ...neurodivergent, [key]: value };
        setNeurodivergent(newNeurodivergent);
        saveSpecificSetting('neurodivergent', newNeurodivergent);
        if (key === 'lowStimulationUI') {
            document.documentElement.classList.toggle('filter', value);
            document.documentElement.classList.toggle('grayscale', value);
            document.documentElement.classList.toggle('contrast-75', value);
        }
   };


  if (isLoading) {
      return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
             <Skeleton className="h-10 w-1/2 mb-8" />
             {[...Array(5)].map((_, i) => (
                 <Card key={i} className="shadow-lg">
                     <CardHeader><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                     <CardContent className="space-y-4">
                         <Skeleton className="h-8 w-full" />
                         <Skeleton className="h-8 w-full" />
                     </CardContent>
                 </Card>
             ))}
        </div>
      );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Settings className="h-8 w-8 text-primary" /> Application Settings
      </h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Preferences</CardTitle>
          <CardDescription>Customize the look, feel, and AI behavior of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-select">Theme</Label>
            <Select value={preferences.theme} onValueChange={(value: Theme) => handlePreferenceChange('theme', value)}>
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
           <div className="flex items-center justify-between">
              <Label htmlFor="growth-pace-select">Personal Growth Pace</Label>
              <Select value={preferences.growthPace} onValueChange={(value: GrowthPace) => handlePreferenceChange('growthPace', value)}>
                  <SelectTrigger id="growth-pace-select" className="w-[180px]" aria-label="Select personal growth pace">
                      <SelectValue placeholder="Select pace" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Slow">Slow</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Aggressive">Aggressive</SelectItem>
                  </SelectContent>
              </Select>
           </div>
           <Separator />
            <h3 className="text-md font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4"/> AI Customization</h3>
            <div className="flex items-center justify-between">
                <Label htmlFor="ai-persona-select">AI Persona</Label>
                <Select value={preferences.aiPersona} onValueChange={(value: AIPersona) => handlePreferenceChange('aiPersona', value)}>
                    <SelectTrigger id="ai-persona-select" className="w-[180px]" aria-label="Select AI Persona">
                        <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Supportive Coach">Supportive Coach</SelectItem>
                        <SelectItem value="Neutral Assistant">Neutral Assistant</SelectItem>
                        <SelectItem value="Direct Analyst">Direct Analyst</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="ai-verbosity-select">AI Insight Verbosity</Label>
                <Select value={preferences.aiInsightVerbosity} onValueChange={(value: AIInsightVerbosity) => handlePreferenceChange('aiInsightVerbosity', value)}>
                    <SelectTrigger id="ai-verbosity-select" className="w-[180px]" aria-label="Select AI Insight Verbosity">
                        <SelectValue placeholder="Select verbosity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Brief Summary">Brief Summary</SelectItem>
                        <SelectItem value="Detailed Analysis">Detailed Analysis</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-1">
                <Label htmlFor="energy-pattern">Your Typical Energy Pattern</Label>
                <Input
                    id="energy-pattern"
                    value={preferences.energyPattern}
                    onChange={(e) => handlePreferenceChange('energyPattern', e.target.value)}
                    placeholder="e.g., High in morning, dip after lunch"
                />
                <p className="text-xs text-muted-foreground">Helps AI tailor suggestions. (e.g., "Morning high, focus dips mid-afternoon")</p>
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="preferred-work-times">Preferred Work Times</Label>
                <Select value={preferences.preferredWorkTimes} onValueChange={(value: PreferredWorkTimes) => handlePreferenceChange('preferredWorkTimes', value)}>
                    <SelectTrigger id="preferred-work-times" className="w-[180px]" aria-label="Select preferred work times">
                        <SelectValue placeholder="Select times" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Afternoon">Afternoon</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                        <SelectItem value="Flexible">Flexible</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
          <CardDescription>Manage how and when you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-reminders">Task Due Date Reminders</Label>
            <Switch id="task-reminders" checked={notifications.taskReminders} onCheckedChange={(checked) => handleNotificationChange('taskReminders', checked)} aria-label="Toggle task due date reminders" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="event-alerts">Calendar Event Alerts</Label>
            <Switch id="event-alerts" checked={notifications.eventAlerts} onCheckedChange={(checked) => handleNotificationChange('eventAlerts', checked)} aria-label="Toggle calendar event alerts" />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="habit-nudges">Habit Nudges & Reminders</Label>
              <Switch id="habit-nudges" checked={notifications.habitNudges} onCheckedChange={(checked) => handleNotificationChange('habitNudges', checked)} aria-label="Toggle habit nudges and reminders" />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="insight-notifications">New Insight Notifications</Label>
              <Switch id="insight-notifications" checked={notifications.insightNotifications} onCheckedChange={(checked) => handleNotificationChange('insightNotifications', checked)} aria-label="Toggle new insight notifications" />
          </div>
        </CardContent>
      </Card>

       <Card className="shadow-lg">
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Integrations</CardTitle>
           <CardDescription>Connect 4Eunoia with other services (features coming soon).</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                    <Label htmlFor="google-calendar-sync" className="font-medium">Google Calendar Sync</Label>
                    <p className="text-xs text-muted-foreground">Sync events between 4Eunoia and Google Calendar.</p>
                </div>
                <Switch id="google-calendar-sync" checked={integrations.googleCalendarSync} onCheckedChange={(checked) => handleIntegrationChange('googleCalendarSync', checked)} aria-label="Toggle Google Calendar sync" disabled />
           </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
                 <div>
                     <Label htmlFor="slack-sync" className="font-medium">Slack Integration</Label>
                     <p className="text-xs text-muted-foreground">Get reminders and updates in Slack.</p>
                 </div>
                 <Switch  id="slack-sync" checked={integrations.slackIntegration} onCheckedChange={(checked) => handleIntegrationChange('slackIntegration', checked)} aria-label="Toggle Slack integration" disabled />
            </div>
         </CardContent>
       </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Neurodivergent Mode</CardTitle>
          <CardDescription>Customize features for ADHD, anxiety, or burnout sensitivity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
              <Label htmlFor="neurodivergent-enable" className="font-medium">Enable Neurodivergent Mode</Label>
              <Switch id="neurodivergent-enable" checked={neurodivergent.enabled} onCheckedChange={(checked) => handleNeurodivergentChange('enabled', checked)} aria-label="Enable Neurodivergent Mode" />
           </div>
            {neurodivergent.enabled && (
                <>
                    <Separator />
                    <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                         <div className="flex items-center justify-between">
                            <Label htmlFor="task-chunking">Enable Task Chunking Suggestions</Label>
                            <Switch id="task-chunking" checked={neurodivergent.taskChunking} onCheckedChange={(checked) => handleNeurodivergentChange('taskChunking', checked)} aria-label="Enable task chunking suggestions" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="low-stimulation">Use Low Stimulation UI</Label>
                            <Switch id="low-stimulation" checked={neurodivergent.lowStimulationUI} onCheckedChange={(checked) => handleNeurodivergentChange('lowStimulationUI', checked)} aria-label="Use low stimulation UI" />
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
                         <div className="flex items-center justify-between">
                            <Label htmlFor="focus-shield">Enable Focus Shield (In-App)</Label>
                             <Switch id="focus-shield" checked={neurodivergent.focusShieldEnabled} onCheckedChange={(checked) => handleNeurodivergentChange('focusShieldEnabled', checked)} aria-label="Enable Focus Shield (In-App)" />
                        </div>
                        <p className="text-xs text-muted-foreground pl-1">Focus Shield subtly de-emphasizes non-critical app sections when high burnout risk is detected, helping you focus on essentials.</p>
                    </div>
                </>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
