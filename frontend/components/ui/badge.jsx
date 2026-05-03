import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-sky-100 text-sky-800 border-sky-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-900 border-amber-200',
    pink: 'bg-bubblegum-100 text-pink-800 border-bubblegum-200',
    outline: 'bg-white text-slate-700 border-slate-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    />
  );
}
