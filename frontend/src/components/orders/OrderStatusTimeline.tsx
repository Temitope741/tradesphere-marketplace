import { Check, Clock, Package, Truck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusHistoryEntry {
  status: string;
  changedAt: string;
  changedByRole?: 'vendor' | 'admin' | 'system';
}

// Turns a raw role into the short label shown next to a timeline step, so
// customers can see who moved the order along, not just when.
function roleLabel(role?: string) {
  if (role === 'vendor') return 'by Vendor';
  if (role === 'admin') return 'by Admin';
  return '';
}

interface OrderStatusTimelineProps {
  status: string;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
}

// The normal, in-order progression a non-cancelled order moves through.
// "pending" is shown to the customer as "Order Placed" since that's the
// step they actually recognize.
const STEPS: { key: string; label: string; icon: typeof Clock }[] = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Check },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderStatusTimeline({ status, statusHistory, createdAt }: OrderStatusTimelineProps) {
  // Cancelled orders don't fit the linear progression — show a standalone
  // state instead of pretending they moved through every step.
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div>
          <p className="font-semibold text-destructive">Order Cancelled</p>
          <p className="text-sm text-muted-foreground">
            {statusHistory?.length
              ? `Cancelled on ${formatDate(statusHistory[statusHistory.length - 1].changedAt)}`
              : 'This order was cancelled.'}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.key === status);
  // Older orders created before statusHistory existed won't have entries
  // for every step — fall back to the order's own createdAt for "Order
  // Placed" and leave later steps undated if we don't know when they happened.
  const entryForStep = (stepKey: string) => statusHistory?.find((h) => h.status === stepKey);
  const timeForStep = (stepKey: string) => {
    const entry = entryForStep(stepKey);
    if (entry) return entry.changedAt;
    if (stepKey === 'pending') return createdAt;
    return undefined;
  };

  return (
    <div className="w-full">
      <div className="flex items-start">
        {STEPS.map((step, index) => {
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const stepTime = timeForStep(step.key);
          const stepRoleLabel = roleLabel(entryForStep(step.key)?.changedByRole);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Connector line to the next step */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 w-full h-0.5',
                    index < currentIndex ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}

              <div
                className={cn(
                  'relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isComplete
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-border text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/15'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <p
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  isComplete ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              <p className="text-[11px] text-muted-foreground text-center">
                {stepTime ? formatDate(stepTime) : isComplete ? '' : '—'}
              </p>
              {stepTime && stepRoleLabel && (
                <p className="text-[11px] text-muted-foreground/70 text-center">{stepRoleLabel}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}