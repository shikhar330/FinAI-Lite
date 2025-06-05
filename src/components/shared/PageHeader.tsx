import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-7 w-7 text-primary" />}
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
