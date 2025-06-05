
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BarChart2, Brain, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  linkTo: string;
  icon: LucideIcon;
}

function QuickActionCard({ title, description, linkTo, icon: Icon }: QuickActionCardProps) {
  return (
    <Link href={linkTo} className="block group">
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md font-semibold group-hover:text-primary transition-colors">{title}</CardTitle>
            <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        {/* Optional: Add a footer or an arrow for visual cue */}
        {/* <CardFooter className="pt-2">
          <ArrowRight className="h-4 w-4 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardFooter> */}
      </Card>
    </Link>
  );
}

export function QuickActionsSection() {
  const actions = [
    {
      title: "Run 'What-If' Scenarios",
      description: "Simulate career changes, investment strategies, or major purchases.",
      linkTo: "/what-if", // Placeholder
      icon: HelpCircle,
    },
    {
      title: "Spending Analytics",
      description: "Analyze your spending habits and find opportunities to save.",
      linkTo: "/analytics",
      icon: BarChart2,
    },
    {
      title: "Get More Financial Advice",
      description: "Ask our AI advisor for personalized financial guidance.",
      linkTo: "/financial-advice",
      icon: Brain,
    },
  ];

  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {actions.map((action) => (
          <QuickActionCard
            key={action.title}
            title={action.title}
            description={action.description}
            linkTo={action.linkTo}
            icon={action.icon}
          />
        ))}
      </div>
    </section>
  );
}
