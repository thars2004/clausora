import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timestamp: Date;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, title?: string, durationMs?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, durationMs?: number) => void;
    error: (message: string, title?: string, durationMs?: number) => void;
    info: (message: string, title?: string, durationMs?: number) => void;
    warning: (message: string, title?: string, durationMs?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, durationMs: number = 4500) => {
      // Prevent duplicate toasts with the same message and type within 2.5 seconds
      let added = false;
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        timestamp: new Date(),
      };

      setToasts((prev) => {
        const now = Date.now();
        const hasRecentDuplicate = prev.some(
          (t) => t.message === message && t.type === type && now - t.timestamp.getTime() < 2500
        );
        if (hasRecentDuplicate) {
          return prev;
        }
        added = true;
        return [...prev, newToast];
      });

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string, durationMs?: number) =>
      showToast(message, 'success', title || 'Success', durationMs),
    error: (message: string, title?: string, durationMs?: number) =>
      showToast(message, 'error', title || 'Error', durationMs),
    info: (message: string, title?: string, durationMs?: number) =>
      showToast(message, 'info', title || 'Notification', durationMs),
    warning: (message: string, title?: string, durationMs?: number) =>
      showToast(message, 'warning', title || 'Warning', durationMs),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}

      {/* Floating Toast Container Portaled to document.body with Top Layer z-index */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed top-5 right-5 z-[100000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
            {toasts.map((t) => {
              const typeConfig = {
                success: {
                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
                  border: 'border-emerald-700/60',
                  bg: 'bg-emerald-950/95',
                  glow: 'shadow-2xl shadow-emerald-950/60',
                  titleColor: 'text-emerald-300',
                },
                error: {
                  icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
                  border: 'border-rose-700/60',
                  bg: 'bg-rose-950/95',
                  glow: 'shadow-2xl shadow-rose-950/60',
                  titleColor: 'text-rose-300',
                },
                info: {
                  icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
                  border: 'border-blue-700/60',
                  bg: 'bg-blue-950/95',
                  glow: 'shadow-2xl shadow-blue-950/60',
                  titleColor: 'text-blue-300',
                },
                warning: {
                  icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
                  border: 'border-amber-700/60',
                  bg: 'bg-amber-950/95',
                  glow: 'shadow-2xl shadow-amber-950/60',
                  titleColor: 'text-amber-300',
                },
              }[t.type];

              return (
                <div
                  key={t.id}
                  className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-md ${typeConfig.bg} ${typeConfig.border} ${typeConfig.glow} transition-all duration-300 animate-slide-in flex items-start gap-3`}
                >
                  {typeConfig.icon}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {t.title && (
                      <h5 className={`text-xs font-bold ${typeConfig.titleColor}`}>
                        {t.title}
                      </h5>
                    )}
                    <p className="text-xs text-slate-200 leading-snug break-words">
                      {t.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

