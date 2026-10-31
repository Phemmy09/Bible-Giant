'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function HostNavTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();

  const tabs = [
    { label: 'Overview', href: `/host/${eventId}` },
    { label: 'Contestants', href: `/host/${eventId}/contestants` },
    { label: 'Rounds', href: `/host/${eventId}/rounds` },
    { label: 'Live Console', href: `/host/${eventId}/live` },
    { label: 'Results', href: `/host/${eventId}/results` },
  ];

  return (
    <div className="w-full bg-cream-100 border-b border-navy-700/15 px-4 sm:px-8 flex items-center justify-between overflow-x-auto">
      <nav className="flex space-x-1 sm:space-x-4 min-w-max">
        {tabs.map((tab) => {
          const isActive =
            tab.href === `/host/${eventId}`
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'px-4 py-3 font-medium text-sm sm:text-base border-b-2 transition-colors',
                isActive
                  ? 'border-gold-500 text-navy-900 font-semibold'
                  : 'border-transparent text-ink-500 hover:text-navy-900 hover:border-navy-700/20'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-4 shrink-0 py-2">
        <Link
          href={`/screen/${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-navy-900 text-cream-50 text-xs sm:text-sm font-medium hover:bg-navy-700 transition-colors shadow-sm"
        >
          <span>Projector Display</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

