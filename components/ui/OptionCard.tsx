import React from 'react';
import clsx from 'clsx';
import { OptionKey } from '@/lib/types';

export interface OptionCardProps {
  optionKey: OptionKey;
  text: string;
  state?: 'default' | 'selected' | 'disabled' | 'correct' | 'wrong' | 'dimmed';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function OptionCard({
  optionKey,
  text,
  state = 'default',
  onClick,
  disabled = false,
  className,
}: OptionCardProps) {
  const isClickable = !disabled && state !== 'disabled' && state !== 'dimmed' && !!onClick;

  const stateStyles = {
    default:
      'bg-white border-navy-700/20 text-navy-900 hover:border-gold-500 hover:shadow-soft active:bg-cream-100',
    selected:
      'bg-gold-500/15 border-gold-500 text-navy-950 font-semibold shadow-soft ring-2 ring-gold-500',
    disabled:
      'bg-cream-100/70 border-navy-700/10 text-ink-500 opacity-60 cursor-not-allowed',
    correct:
      'bg-success/15 border-success text-success font-bold ring-2 ring-success shadow-soft',
    wrong:
      'bg-danger/15 border-danger text-danger font-semibold ring-2 ring-danger shadow-soft',
    dimmed:
      'bg-cream-100/50 border-navy-700/10 text-ink-500/50 opacity-40 cursor-not-allowed',
  };

  const badgeStyles = {
    default: 'bg-cream-100 text-navy-900 border-navy-700/20',
    selected: 'bg-gold-500 text-navy-950 font-bold border-gold-500',
    disabled: 'bg-cream-100 text-ink-500 border-navy-700/10',
    correct: 'bg-success text-white border-success',
    wrong: 'bg-danger text-white border-danger',
    dimmed: 'bg-cream-100/50 text-ink-500/50 border-navy-700/10',
  };

  return (
    <button
      type="button"
      disabled={disabled || state === 'disabled' || state === 'dimmed'}
      onClick={isClickable ? onClick : undefined}
      className={clsx(
        'w-full min-h-[56px] p-4 rounded-btn border text-left transition-all flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-gold-500',
        stateStyles[state],
        className
      )}
    >
      <span
        className={clsx(
          'w-10 h-10 rounded-full border flex items-center justify-center font-mono font-bold text-base shrink-0 transition-colors',
          badgeStyles[state]
        )}
      >
        {optionKey}
      </span>
      <span className="text-base sm:text-lg leading-snug flex-1 font-medium">
        {text}
      </span>
    </button>
  );
}

