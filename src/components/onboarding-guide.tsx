
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, BookOpen, ListChecks, Lightbulb, Users } from 'lucide-react';

const ONBOARDING_STORAGE_KEY = '4eunoia-onboarding-complete';

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: React.ReactNode;
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to 4Eunoia!',
    description: (
      <>
        Your personal OS for productivity, self-reflection, and well-being.
        <br />
        Let&apos;s take a quick tour of the key features.
      </>
    ),
  },
  {
    icon: Users,
    title: 'Mock Data vs. Your Data',
    description: (
      <>
        Currently, you&apos;re viewing sample data to explore the app.
        When you&apos;re ready, click the &quot;Start My Journey&quot; button
        (usually on the Dashboard) to switch to your private, locally-stored data.
        Your changes will only be saved in user data mode.
      </>
    ),
  },
  {
    icon: BookOpen,
    title: 'Daily Logging',
    description: 'Record your activities, mood, focus levels, and diary entries. Consistent logging helps the AI provide better insights into your patterns and well-being.',
  },
  {
    icon: ListChecks,
    title: 'Task Management',
    description: 'Create, manage, and track your tasks with statuses and due dates. Stay organized and on top of your to-dos to boost productivity.',
  },
  {
    icon: Lightbulb,
    title: 'AI Insights & Coaching',
    description: 'Leverage AI to analyze your data, discover patterns in your productivity, expenses, and sentiments, and get personalized suggestions for growth.',
  },
  {
    icon: CheckCircle,
    title: "You're All Set!",
    description: "Explore 4Eunoia and start your journey towards a more organized, insightful, and productive life. You can always find more details in the README file.",
  },
];

export const OnboardingGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const onboardingComplete = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (onboardingComplete !== 'true') {
        setIsOpen(true);
      }
    }
  }, [isMounted]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  };

  if (!isMounted || !isOpen) {
    return null;
  }

  const StepIcon = onboardingSteps[currentStep].icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleFinish(); }}>
      <DialogContent 
        className="sm:max-w-[520px] p-6" 
        onPointerDownOutside={(e) => e.preventDefault()} // Prevents closing by clicking outside for guided flow
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevents closing with Escape key
      >
        <DialogHeader className="items-center text-center space-y-3">
          <div className="bg-primary/10 text-primary p-3 rounded-full mb-2 inline-block">
            <StepIcon className="h-10 w-10" />
          </div>
          <DialogTitle className="text-2xl font-semibold">{onboardingSteps[currentStep].title}</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1 px-4 text-sm leading-relaxed">
            {onboardingSteps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-6">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2.5 w-2.5 rounded-full mx-1.5 transition-all duration-300 ${
                currentStep === index ? 'bg-primary scale-125' : 'bg-muted'
              }`}
              aria-current={currentStep === index ? "step" : undefined}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between pt-2">
          {currentStep > 0 ? (
            <Button variant="outline" onClick={handlePrev} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
          ) : (
            <div className="w-full sm:w-auto" /> // Placeholder to keep layout consistent
          )}
          {currentStep < onboardingSteps.length - 1 ? (
            <Button onClick={handleNext} className="w-full sm:w-auto">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
              Get Started <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
