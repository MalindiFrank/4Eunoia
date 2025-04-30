import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Calendar, CheckSquare, CreditCard, Lightbulb, ListChecks, StickyNote } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Daily Log"
          icon={Activity}
          description="Log your daily activities and reflections."
          href="/daily-log"
        />
        <DashboardCard
          title="Tasks"
          icon={ListChecks}
          description="Manage your to-do list."
          href="/tasks"
        />
        <DashboardCard
          title="Reminders"
          icon={StickyNote}
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
          title="Insights"
          icon={Lightbulb}
          description="Get AI-powered personal insights."
          href="/insights"
        />
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
      <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
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
