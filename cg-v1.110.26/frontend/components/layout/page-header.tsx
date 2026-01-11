'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LucideIcon } from 'lucide-react';

/**
 * CommonGround PageHeader Component
 *
 * Design: Consistent headers with breadcrumb, title, description, and actions.
 * Philosophy: "Clear hierarchy helps stressed users orient quickly"
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backPath?: string;
  backLabel?: string;
  children?: React.ReactNode; // For action buttons
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  backPath,
  backLabel = 'Back',
  children,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-8">
      {/* Back Button */}
      {backPath && (
        <button
          onClick={() => router.push(backPath)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      )}

      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {/* Icon */}
          {Icon && (
            <div className="flex-shrink-0 p-2 bg-accent rounded-lg">
              <Icon className="h-6 w-6 text-accent-foreground" />
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {children && (
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}

/**
 * PageSection Component
 *
 * Use for grouping related content within a page.
 */
interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  children,
  className = '',
}: PageSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * PageContainer Component
 *
 * Standard max-width container with responsive padding.
 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean; // For forms, focused content
}

export function PageContainer({
  children,
  className = '',
  narrow = false,
}: PageContainerProps) {
  return (
    <main
      className={`
        mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8
        ${narrow ? 'max-w-3xl' : 'max-w-7xl'}
        ${className}
      `}
    >
      {children}
    </main>
  );
}

/**
 * EmptyState Component
 *
 * For when there's no content to display.
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="p-4 bg-muted rounded-full mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
