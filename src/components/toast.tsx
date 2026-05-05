'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Shortcut to show a toast from anywhere. */
export const toast = {
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = {
    error: 'bg-warn text-white',
    success: 'bg-signal text-white',
    info: 'bg-ink text-white',
  };

  return (
    <div
      className={`${colors[t.type]} rounded-xl px-4 py-3 shadow-dropdown flex items-start gap-3 animate-slide-up`}
      role="alert"
    >
      <p className="text-base flex-1">{t.message}</p>
      <button onClick={onDismiss} className="text-white/60 hover:text-white text-lg leading-none mt-0.5">&times;</button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
