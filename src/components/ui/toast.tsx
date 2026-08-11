'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  push: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-3 ${
              item.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 ring-1 ring-emerald-500/30'
                : item.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 ring-1 ring-rose-500/30'
                : 'bg-stone-900/90 text-stone-100 ring-1 ring-stone-700/40'
            }`}
          >
            {item.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
            {item.type === 'error' && <AlertCircle size={18} className="text-rose-400 shrink-0" />}
            {item.type === 'info' && <Info size={18} className="text-emerald-400 shrink-0" />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

