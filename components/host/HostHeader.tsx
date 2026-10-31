'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/lib/../components/ui/Button';

export function HostHeader({ eventName }: { eventName?: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/host/login');
    router.refresh();
  }

  return (
    <header className="w-full bg-navy-900 border-b border-navy-700 text-cream-50 px-4 sm:px-8 py-4 flex items-center justify-between shadow-soft">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link href="/host" className="flex flex-col">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-cream-50">
            Bible Giants
          </span>
          <span className="h-0.5 w-full bg-gold-500 rounded-full" />
        </Link>
        {eventName && (
          <span className="hidden sm:inline-block text-gold-300 font-medium text-lg border-l border-navy-700 pl-4">
            {eventName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <span className="text-xs sm:text-sm text-gold-300 font-medium px-2.5 py-1 rounded-chip bg-navy-700/60 border border-gold-500/20">
          Operator
        </span>
        <Button
          variant="ghost"
          size="md"
          onClick={handleSignOut}
          className="text-cream-50 hover:bg-navy-700 border-navy-700 text-sm"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}

