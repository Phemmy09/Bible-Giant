'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client error
    console.error('App error caught by error boundary:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col items-center justify-between p-6 sm:p-12 text-center select-none">
      <header className="w-full flex justify-center py-4">
        <span className="font-display text-2xl font-bold tracking-tight text-navy-900">
          Bible Giants
        </span>
      </header>

      <div className="flex flex-col items-center gap-6 max-w-md w-full my-auto animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-danger/15 text-danger flex items-center justify-center font-bold text-2xl border border-danger/30">
          !
        </div>

        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">
            Something went wrong
          </h1>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            A temporary error occurred while updating the screen. Your connection to the event remains safe. Please try refreshing the screen.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => reset()}
            className="w-full font-bold"
          >
            Try Again
          </Button>
          <Link href="/" className="w-full">
            <Button variant="ghost" size="lg" className="w-full">
              Back to Entrance
            </Button>
          </Link>
        </div>
      </div>

      <footer className="w-full py-4 text-xs text-ink-500">
        The Apostolic Faith Church • Ondo & Ekiti Camp Meeting
      </footer>
    </main>
  );
}

