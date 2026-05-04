'use client';
import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-focus disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-sky-600 text-white hover:bg-sky-700 shadow-soft hover:shadow-pop',
        secondary:
          'bg-amber-100 text-slate-900 border border-amber-200 hover:bg-amber-200',
        accent:
          'bg-bubblegum-200 text-slate-900 border border-bubblegum-300 hover:bg-bubblegum-300',
        outline:
          'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
        ghost:
          'bg-transparent text-slate-700 hover:bg-slate-100',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        link: 'text-sky-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        suppressHydrationWarning
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
