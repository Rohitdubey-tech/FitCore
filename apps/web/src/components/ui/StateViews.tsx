import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-fitcore-border bg-fitcore-card/50 px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-fitcore-muted">
      <Inbox className="h-6 w-6" />
    </div>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-fitcore-muted">{description}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction} size="sm" className="mt-4">
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-10 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-fitcore-muted">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="secondary" size="sm" className="mt-4">
        Try again
      </Button>
    )}
  </div>
);

