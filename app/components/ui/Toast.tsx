'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type'], action?: Toast['action'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', action?: Toast['action'], duration: number = 4000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type, action, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />,
          className: 'bg-white border-l-4 border-l-green-600 border-t border-r border-b border-gray-300'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
          className: 'bg-white border-l-4 border-l-red-600 border-t border-r border-b border-gray-300'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />,
          className: 'bg-white border-l-4 border-l-amber-600 border-t border-r border-b border-gray-300'
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-5 w-5 text-purple-900 flex-shrink-0" />,
          className: 'bg-white border-l-4 border-l-purple-900 border-t border-r border-b border-gray-300'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="left">
        {children}
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <ToastPrimitive.Root
              key={toast.id}
              className={`${styles.className} rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-[500px] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=closed]:fade-out data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-left`}
              duration={toast.duration ?? 4000}
            >
              {styles.icon}
              <ToastPrimitive.Description className="flex-1 text-sm text-gray-950">
                {toast.message}
              </ToastPrimitive.Description>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                  className="text-xs font-medium text-purple-700 hover:text-purple-900 whitespace-nowrap transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
              <ToastPrimitive.Close
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                onClick={() => removeToast(toast.id)}
              >
                <X className="h-4 w-4 text-gray-600" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-[390px] max-w-[100vw] z-[100]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
