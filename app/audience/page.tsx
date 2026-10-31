'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rpcJoinAsAudience, rpcGetEventByCode } from '@/lib/rpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEFAULT_EVENT_CODE } from '@/lib/defaultEvent';

export default function AudienceJoinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState(DEFAULT_EVENT_CODE);
  const [name, setName] = useState('');
  const [region, setRegion] = useState<'Ekiti' | 'Ondo' | 'Audience'>('Ekiti');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // If already joined previously, check saved session and redirect
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const savedCode = localStorage.getItem('bible_giants_audience_code');
          if (savedCode) {
            const evRes = await rpcGetEventByCode(savedCode, supabase);
            if (evRes.ok && evRes.data) {
              router.push(`/audience/${savedCode.toUpperCase()}`);
              return;
            }
          }
        }
      } catch {
        // Continue to show join form
      } finally {
        setIsCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [router, supabase]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase() || DEFAULT_EVENT_CODE;
    const displayName = name.trim();

    if (!cleanCode || cleanCode.length !== 5) {
      setError('Please enter a valid 5-character event code');
      return;
    }
    if (!displayName || displayName.length < 1 || displayName.length > 30) {
      setError('Please enter your name (1–30 characters)');
      return;
    }

    const taggedName = region !== 'Audience' ? `${displayName} (${region})` : displayName;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Ensure anonymous auth session exists
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          await supabase.auth.signInAnonymously();
        }
      } catch {
        // Continue for fallback
      }

      // 2. Call join_as_audience RPC
      const res = await rpcJoinAsAudience(cleanCode, taggedName, supabase);

      localStorage.setItem('bible_giants_audience_code', cleanCode);
      localStorage.setItem('bible_giants_audience_name', taggedName);
      localStorage.setItem('bible_giants_audience_region', region);

      if (res.ok) {
        router.push(`/audience/${cleanCode}`);
      } else {
        // Fallback allow join
        router.push(`/audience/${cleanCode}`);
      }
    } catch {
      localStorage.setItem('bible_giants_audience_code', cleanCode);
      localStorage.setItem('bible_giants_audience_name', taggedName);
      router.push(`/audience/${cleanCode}`);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-ink-500">
          <svg
            className="animate-spin h-6 w-6 text-gold-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Connecting to Bible Giants…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900">
              Bible Giants
            </h1>
            <div className="h-0.5 w-full bg-gold-500 mt-1 rounded-full" />
          </Link>
          <p className="mt-2 text-ink-500 font-medium text-sm sm:text-base">
            Audience Participation — Ondo & Ekiti Camp Meeting
          </p>
        </div>

        {/* Join Card */}
        <Card className="w-full bg-white shadow-soft p-6 sm:p-8">
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-medium text-center"
              >
                {error}
              </div>
            )}

            {/* Event Code */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-navy-900">
                  Event Code
                </label>
                <span className="text-xs bg-gold-100 text-gold-900 px-2 py-0.5 rounded font-mono font-bold">
                  Hardcoded: {DEFAULT_EVENT_CODE}
                </span>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={DEFAULT_EVENT_CODE}
                maxLength={5}
                required
                className="w-full min-h-[48px] text-center font-mono text-xl font-extrabold uppercase tracking-widest rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Your Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bro. David"
                maxLength={30}
                required
                autoFocus
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Region / State Tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Audience Region
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRegion('Ekiti')}
                  className={`min-h-[40px] text-xs font-bold rounded-btn border transition-all ${
                    region === 'Ekiti'
                      ? 'bg-gold-500 text-navy-900 border-gold-600 shadow-sm'
                      : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                  }`}
                >
                  Ekiti Area
                </button>
                <button
                  type="button"
                  onClick={() => setRegion('Ondo')}
                  className={`min-h-[40px] text-xs font-bold rounded-btn border transition-all ${
                    region === 'Ondo'
                      ? 'bg-gold-500 text-navy-900 border-gold-600 shadow-sm'
                      : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                  }`}
                >
                  Ondo Area
                </button>
                <button
                  type="button"
                  onClick={() => setRegion('Audience')}
                  className={`min-h-[40px] text-xs font-bold rounded-btn border transition-all ${
                    region === 'Audience'
                      ? 'bg-navy-900 text-cream-50 border-navy-900 shadow-sm'
                      : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                  }`}
                >
                  General
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Join Audience
            </Button>
          </form>
        </Card>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs sm:text-sm font-medium text-ink-500 hover:text-navy-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
