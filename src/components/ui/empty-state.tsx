import { LucideIcon, Package, ShoppingCart, FileText, Users, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const sizes = {
    default: {
      container: 'py-12',
      icon: 'w-16 h-16',
      iconWrapper: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-sm',
    },
    compact: {
      container: 'py-6',
      icon: 'w-10 h-10',
      iconWrapper: 'w-14 h-14',
      title: 'text-base',
      description: 'text-xs',
    },
    large: {
      container: 'py-20',
      icon: 'w-20 h-20',
      iconWrapper: 'w-28 h-28',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const size = sizes[variant];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", size.container, className)}>
      <div className={cn(
        "rounded-full bg-muted/50 flex items-center justify-center mb-4",
        size.iconWrapper
      )}>
        <Icon className={cn("text-muted-foreground", size.icon)} />
      </div>
      <h3 className={cn("font-semibold text-foreground mb-2", size.title)}>{title}</h3>
      <p className={cn("text-muted-foreground max-w-sm mb-4", size.description)}>{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="gradient" size={variant === 'compact' ? 'sm' : 'default'}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states
export function NoOrdersEmpty({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No orders yet"
      description="Place your first order to start growing your social media presence organically."
      action={onAction ? { label: "Place Order", onClick: onAction } : undefined}
    />
  );
}

export function NoServicesEmpty() {
  return (
    <EmptyState
      icon={Package}
      title="No services available"
      description="Check back later for available services or contact support."
    />
  );
}

export function NoResultsEmpty({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={searchTerm ? `No results found for "${searchTerm}". Try a different search term.` : "No matching results. Try adjusting your filters."}
      variant="compact"
    />
  );
}

export function NoUsersEmpty() {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="No users match your current filters."
      variant="compact"
    />
  );
}

export function NoTransactionsEmpty() {
  return (
    <EmptyState
      icon={FileText}
      title="No transactions yet"
      description="Your transaction history will appear here once you make a deposit or place an order."
    />
  );
}
