'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// A photo that gracefully falls back to a branded gradient if it fails to load,
// so a broken Unsplash URL never shows an ugly placeholder.
export function SmartImage({
  src,
  alt,
  className = '',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 ${className}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

// Thin top progress bar (value 0..1).
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

// A selectable answer card.
export function OptionCard({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`group flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
      }`}
    >
      <span>
        <span className="block text-base font-semibold text-slate-800">{label}</span>
        {sub && <span className="mt-0.5 block text-sm text-slate-500">{sub}</span>}
      </span>
      <span
        className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300 group-hover:border-primary-400'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}

export function TextField({
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: 'text' | 'email' | 'tel';
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      inputMode={inputMode}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500"
    />
  );
}

// Standard title + optional subtitle block for a screen.
export function ScreenHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-[26px]">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{subtitle}</p>}
    </div>
  );
}
