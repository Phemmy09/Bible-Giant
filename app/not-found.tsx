import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream-50 flex flex-col items-center justify-between p-6 sm:p-12 text-center select-none">
      <header className="w-full flex justify-center py-4">
        <span className="font-display text-2xl font-bold tracking-tight text-navy-900">
          Bible Giants
        </span>
      </header>

      <div className="flex flex-col items-center gap-6 max-w-md w-full my-auto animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gold-500/20 text-navy-900 flex items-center justify-center font-mono font-bold text-3xl border border-gold-500/40">
          404
        </div>

        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-navy-900">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-ink-500 mt-2 leading-relaxed">
            We could not find the page you were looking for. If you are joining the competition, please return to the main entrance page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <Link href="/" className="w-full">
            <Button variant="primary" size="lg" className="w-full font-bold">
              ← Return to Home
            </Button>
          </Link>
          <Link href="/audience" className="w-full">
            <Button variant="gold" size="lg" className="w-full font-bold">
              Audience Join
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

