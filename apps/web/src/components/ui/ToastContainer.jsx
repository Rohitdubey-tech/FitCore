import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
export const ToastContainer = () => {
    const { toasts, dismissToast } = useToastStore();
    if (toasts.length === 0)
        return null;
    return (<div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((toast) => {
            const Icon = toast.variant === 'success'
                ? CheckCircle2
                : toast.variant === 'error'
                    ? XCircle
                    : Info;
            const iconColor = toast.variant === 'success'
                ? 'text-fitcore-accent'
                : toast.variant === 'error'
                    ? 'text-red-400'
                    : 'text-sky-400';
            return (<div key={toast.id} role="status" className="flex items-start gap-3 rounded-xl border border-fitcore-border bg-fitcore-card p-3.5 shadow-2xl">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`}/>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{toast.title}</p>
              {toast.description && (<p className="mt-0.5 text-xs text-fitcore-muted">{toast.description}</p>)}
            </div>
            <button onClick={() => dismissToast(toast.id)} className="rounded-lg p-1 text-fitcore-muted hover:bg-white/5 hover:text-white" aria-label="Dismiss notification">
              <X className="h-4 w-4"/>
            </button>
          </div>);
        })}
    </div>);
};
