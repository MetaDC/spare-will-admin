import React from 'react';
import { InquiryStatus } from '../types';

const statusConfig: Record<
  InquiryStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  New: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  Reviewing: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  'Price Sent': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  Completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Cancelled: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

interface StatusBadgeProps {
  status: InquiryStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const conf = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold tracking-tight rounded-full border shadow-2xs transition-all ${
        conf.bg
      } ${conf.text} ${conf.border} ${
        isSmall ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} animate-pulse`} />
      {status}
    </span>
  );
}

