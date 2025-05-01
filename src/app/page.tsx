import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Calendar, CheckSquare, CreditCard, Lightbulb, ListChecks, PieChart, Settings, Smile, StickyNote, Target, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-3">
             {/* Main Dashboard Area */}
             <div className="lg:col-span-2 flex flex-col gap-8">
                 <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

                 {/* Daily Personal Assistant Feed Placeholder */}
                 <Card className="shadow-lg border-primary/20">
                     <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                             <Zap className="h-5 w-5 text-primary" /> Today's Outlook
                         </CardTitle>
                         <CardDescription>Your personalized summary and suggestions for the day.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         {/* Placeholder Content - Replace with dynamic feed */}
                         <div className="space-y-3 text-sm text-muted-foreground">
                             <p>☀️ Good morning! Looks like a busy day ahead.</p>
                             <p>📈 **Goal Focus:** Complete 2 pomodoros on 'Project X'.</p>
                             <p>🧘 **Suggestion:** Schedule a 10-minute walk around 2 PM based on your energy pattern.</p>
                             <p>Upcoming: Team Meeting at 11:00 AM.</p>
                             <p className="italic">"The secret of getting ahead is getting started." - Mark Twain</p>
                         </div>
                         {/* TODO: Implement AI flow 'generateDailyFeed' and render its output here */}
                     </CardContent>
                 </Card>


                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"> {/* Nested grid for other cards */}
                    <DashboardCard
                        title="Daily Log"
                        icon={Activity}
                        description="Log activities, mood & reflections."
                        href="/daily-log"
                    />
                    <DashboardCard
                        title="Tasks"
                        icon={ListChecks}
                        description="Manage your to-do list."
                        href="/tasks"
                    />
                     <DashboardCard
                        title="Goals & Habits"
                        icon={Target}
                        description="Track goals and build habits."
                        href="/goals-habits"
                    />
                    <DashboardCard
                        title="Reminders"
                        icon={StickyNote} // Consider Bell icon later if preferred
                        description="Set and view reminders."
                        href="/reminders"
                    />
                    <DashboardCard
                        title="Calendar"
                        icon={Calendar}
                        description="View your schedule."
                        href="/calendar"
                    />
                    <DashboardCard
                        title="Expenses"
                        icon={CreditCard}
                        description="Track your spending."
                        href="/expenses"
                    />
                     <DashboardCard
                        title="Notes"
                        icon={StickyNote}
                        description="Take and organize notes."
                        href="/notes"
                    />
                    <DashboardCard
                        title="Wellness"
                        icon={Smile}
                        description="Access self-care tools."
                        href="/wellness"
                    />
                     <DashboardCard
                        title="Settings"
                        icon={Settings}
                        description="Customize your experience."
                        href="/settings"
                    />
                </div>
            </div>

             {/* Sidebar-like area for Insights & Visualizations */}
             <div className="lg:col-span-1 flex flex-col gap-6 pt-12 lg:pt-[68px]"> {/* Adjust top padding */}
                  <DashboardCardLarge
                    title="Insights"
                    icon={Lightbulb}
                    description="Get AI-powered personal insights on productivity, mood, spending, and more."
                    href="/insights"
                  />
                 <DashboardCardLarge
                   title="Visualizations"
                   icon={PieChart}
                   description="See charts and graphs of your data trends over time."
                   href="/visualizations"
                 />
                 {/* Add other key stats or quick actions here */}
            </div>

        </div>
    </div>
  );
}


interface DashboardCardProps {
  title: string;
  icon: React.ElementType;
  description: string;
  href: string;
}

function DashboardCard({ title, icon: Icon, description, href }: DashboardCardProps) {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// Larger card variant for sidebar-like area
function DashboardCardLarge({ title, icon: Icon, description, href }: DashboardCardProps) {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full hover:border-primary/40 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
             <Icon className="h-5 w-5 text-primary" />
             {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
