'use client';
import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

/**
 * Decorative floating SVG/lucide notes + soft cloud blobs.
 * Pure CSS animations, respects prefers-reduced-motion via tailwind keyframes.
 */
export function FloatingDecor({ density = 'normal', tone = 'sky' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const dotsBase =
    'pointer-events-none select-none absolute opacity-70';

  const noteColor =
    tone === 'pink'
      ? 'text-bubblegum-400'
      : tone === 'amber'
      ? 'text-amber-500'
      : 'text-sky-500';

  const items =
    density === 'sparse'
      ? [
          { top: '6%', left: '4%', size: 28, delay: 0, anim: 'animate-floaty' },
          { top: '12%', right: '8%', size: 22, delay: 1, anim: 'animate-floaty-lg' },
          { bottom: '8%', left: '10%', size: 26, delay: 2, anim: 'animate-floaty' },
        ]
      : [
          { top: '4%', left: '6%', size: 28, delay: 0, anim: 'animate-floaty' },
          { top: '10%', left: '40%', size: 18, delay: 1.2, anim: 'animate-floaty-lg' },
          { top: '14%', right: '8%', size: 32, delay: 0.6, anim: 'animate-floaty' },
          { top: '40%', left: '3%', size: 22, delay: 2, anim: 'animate-floaty-lg' },
          { bottom: '14%', right: '12%', size: 26, delay: 1, anim: 'animate-floaty' },
          { bottom: '8%', left: '24%', size: 20, delay: 1.6, anim: 'animate-floaty-lg' },
        ];

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-testid="floating-decor"
    >
      {/* Soft blobs */}
      <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="absolute top-1/3 -right-12 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-10 left-1/3 h-44 w-44 rounded-full bg-bubblegum-200/40 blur-3xl" />

      {items.map((it, i) => (
        <span
          key={i}
          className={`${dotsBase} ${noteColor} ${it.anim}`}
          style={{
            top: it.top,
            left: it.left,
            right: it.right,
            bottom: it.bottom,
            animationDelay: `${it.delay}s`,
          }}
        >
          <Music size={it.size} strokeWidth={2.4} />
        </span>
      ))}
    </div>
  );
}

export function CloudDivider({ position = 'bottom', className = '' }) {
  const transform = position === 'top' ? 'rotate-180' : '';
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg
        className={`block w-full h-12 sm:h-16 text-white ${transform}`}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0,40 C120,80 240,0 360,40 C480,80 600,0 720,40 C840,80 960,0 1080,40 C1200,80 1320,0 1440,40 L1440,80 L0,80 Z"
        />
      </svg>
    </div>
  );
}
