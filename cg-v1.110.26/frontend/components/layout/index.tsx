'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  LucideIcon,
  CheckCircle,
  Clock,
  Archive,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info,
  XCircle,
} from 'lucide-react';

/* =============================================================================
   PAGE LAYOUT COMPONENTS
   CommonGround Design System - Organic Minimalist
   ============================================================================= */

/**
 * PageHeader - Consistent page headers with breadcrumb, title, and actions
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backPath?: string;
  backLabel?: string;
  children?: React.ReactNode;
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
      {backPath && (
        <button
          onClick={() => router.push(backPath)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cg-sage transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
              <Icon className="h-5 w-5 text-cg-sage" />
            </div>
          )}
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}

/**
 * PageContainer - Standard max-width container with responsive padding
 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  background?: 'sand' | 'white' | 'transparent';
}

export function PageContainer({
  children,
  className = '',
  narrow = false,
  background = 'sand',
}: PageContainerProps) {
  const bgClasses = {
    sand: 'bg-cg-sand min-h-screen',
    white: 'bg-card min-h-screen',
    transparent: '',
  };

  return (
    <main className={`${bgClasses[background]} ${className}`}>
      <div className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}>
        {children}
      </div>
    </main>
  );
}

/**
 * PageSection - Grouping related content within a page
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

/* =============================================================================
   STATUS & FEEDBACK COMPONENTS
   ============================================================================= */

/**
 * StatusBadge - Semantic status indicators
 */
type StatusType = 'active' | 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'archived' | 'draft' | 'success' | 'warning' | 'error';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const configs: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    active: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Active',
    },
    approved: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Approved',
    },
    success: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Success',
    },
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-cg-amber-subtle text-cg-amber border-cg-amber/20',
      label: 'Pending',
    },
    pending_approval: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-cg-amber-subtle text-cg-amber border-cg-amber/20',
      label: 'Pending Approval',
    },
    warning: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      className: 'bg-cg-amber-subtle text-cg-amber border-cg-amber/20',
      label: 'Warning',
    },
    draft: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      label: 'Draft',
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-error-subtle text-cg-error border-cg-error/20',
      label: 'Rejected',
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-error-subtle text-cg-error border-cg-error/20',
      label: 'Error',
    },
    archived: {
      icon: <Archive className="h-3.5 w-3.5" />,
      className: 'bg-muted text-muted-foreground border-border',
      label: 'Archived',
    },
  };

  const config = configs[status] || configs.pending;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${config.className} ${className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

/**
 * LoadingState - Consistent loading spinners
 */
interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = 'Loading...', fullPage = false }: LoadingStateProps) {
  const content = (
    <div className="text-center">
      <Loader2 className="h-10 w-10 animate-spin text-cg-sage mx-auto" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  );
}

/**
 * ErrorState - Error display component
 */
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div className={`p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl flex items-center gap-3 ${className}`}>
      <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
      <p className="text-sm text-cg-error font-medium flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-cg-error hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * EmptyState - When there's no content to display
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cg-sage-subtle via-cg-amber-subtle to-pink-100 flex items-center justify-center">
          <Icon className="h-10 w-10 text-cg-sage" />
        </div>
      )}
      <h3 className="font-serif text-xl font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <button className="cg-btn-primary">{action.label}</button>
          </Link>
        ) : (
          <button className="cg-btn-primary" onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

/**
 * InfoBanner - Informational notices
 */
interface InfoBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  className?: string;
}

export function InfoBanner({ type = 'info', title, message, className = '' }: InfoBannerProps) {
  const configs = {
    info: {
      bg: 'bg-cg-sage-subtle/30 border-cg-sage/10',
      icon: <Info className="h-5 w-5 text-cg-sage" />,
      titleColor: 'text-cg-sage',
      textColor: 'text-cg-sage/80',
    },
    success: {
      bg: 'bg-cg-success-subtle border-cg-success/20',
      icon: <CheckCircle className="h-5 w-5 text-cg-success" />,
      titleColor: 'text-cg-success',
      textColor: 'text-cg-success/80',
    },
    warning: {
      bg: 'bg-cg-amber-subtle border-cg-amber/20',
      icon: <AlertTriangle className="h-5 w-5 text-cg-amber" />,
      titleColor: 'text-cg-amber',
      textColor: 'text-cg-amber/80',
    },
    error: {
      bg: 'bg-cg-error-subtle border-cg-error/20',
      icon: <AlertCircle className="h-5 w-5 text-cg-error" />,
      titleColor: 'text-cg-error',
      textColor: 'text-cg-error/80',
    },
  };

  const config = configs[type];

  return (
    <div className={`p-4 rounded-xl border ${config.bg} ${className}`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div>
          {title && <h4 className={`font-medium ${config.titleColor} mb-1`}>{title}</h4>}
          <p className={`text-sm ${config.textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   CARD COMPONENTS
   ============================================================================= */

/**
 * ContentCard - Standard content card with optional header
 */
interface ContentCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ContentCard({
  title,
  description,
  icon: Icon,
  children,
  action,
  className = '',
  padding = 'md',
}: ContentCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div className={`cg-card ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-4 ${padding !== 'none' ? 'p-5 border-b border-border' : ''}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Icon className="h-5 w-5 text-cg-sage" />
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-foreground">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}

/**
 * InteractiveCard - Clickable card with hover state
 */
interface InteractiveCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
}

export function InteractiveCard({
  children,
  onClick,
  href,
  className = '',
  disabled = false,
}: InteractiveCardProps) {
  const baseClasses = `cg-card-interactive p-5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    );
  }

  return (
    <div
      className={baseClasses}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
}

/**
 * StatCard - Metric display card
 */
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  status = 'neutral',
  className = '',
}: StatCardProps) {
  const statusColors = {
    success: 'text-cg-success',
    warning: 'text-cg-amber',
    error: 'text-cg-error',
    neutral: 'text-foreground',
  };

  return (
    <div className={`cg-card p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={`text-2xl font-bold ${statusColors[status]}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${
              trend.direction === 'up' ? 'text-cg-success' :
              trend.direction === 'down' ? 'text-cg-error' :
              'text-muted-foreground'
            }`}>
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-cg-sage-subtle rounded-lg">
            <Icon className="h-5 w-5 text-cg-sage" />
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   LIST & ITEM COMPONENTS
   ============================================================================= */

/**
 * ListItem - Standard list item with navigation arrow
 */
interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  showArrow?: boolean;
  className?: string;
}

export function ListItem({
  children,
  onClick,
  href,
  showArrow = true,
  className = '',
}: ListItemProps) {
  const content = (
    <>
      <div className="flex-1 min-w-0">{children}</div>
      {showArrow && (
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cg-sage group-hover:translate-x-1 transition-all flex-shrink-0" />
      )}
    </>
  );

  const baseClasses = `cg-card-interactive p-4 flex items-center gap-4 group ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClasses}>
      {content}
    </div>
  );
}

/**
 * Avatar - User/child avatar with initials or emoji
 */
interface AvatarProps {
  name?: string;
  emoji?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({
  name,
  emoji,
  imageUrl,
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name || 'Avatar'} className="w-full h-full object-cover" />
      ) : emoji ? (
        <span>{emoji}</span>
      ) : (
        <span className="font-medium text-cg-sage">{initials}</span>
      )}
    </div>
  );
}

/* =============================================================================
   FORM FIELD COMPONENTS
   ============================================================================= */

/**
 * InfoField - Read-only display field
 */
interface InfoFieldProps {
  label: string;
  value: string | React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function InfoField({ label, value, icon: Icon, className = '' }: InfoFieldProps) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="text-foreground">{value || '-'}</p>
    </div>
  );
}

/**
 * FormField - Standard form input wrapper
 */
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-cg-error ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-cg-error mt-1">{error}</p>
      )}
    </div>
  );
}

/* =============================================================================
   DIVIDER COMPONENTS
   ============================================================================= */

/**
 * Divider - Section divider
 */
interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return <div className={`h-px bg-border ${className}`} />;
}
