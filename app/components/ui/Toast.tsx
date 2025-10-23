'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void;
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

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="left">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-[500px] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=closed]:fade-out data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-left"
            duration={4000}
          >
            <Info className="h-5 w-5 text-purple-900 flex-shrink-0" />
            <ToastPrimitive.Description className="flex-1 text-sm text-gray-950">
              {toast.message}
            </ToastPrimitive.Description>
            <ToastPrimitive.Close
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-4 w-4 text-gray-600" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-[390px] max-w-[100vw] z-[100]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
