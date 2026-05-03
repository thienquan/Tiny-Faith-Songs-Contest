'use client';
import { Toaster as Sonner } from 'sonner';

export function Toaster(props) {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-slate-200 shadow-soft text-slate-800 rounded-xl',
          title: 'font-semibold',
          description: 'text-slate-600',
        },
      }}
      {...props}
    />
  );
}
