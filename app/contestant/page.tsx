'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rpcJoinAsContestant, rpcGetEventByCode } from '@/lib/rpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function ContestantSignInPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState('');
  const [seat, setSeat] = useState<number>(1);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const savedCode = localStorage.getItem('bible_giants_contestant_code');
          if (savedCode) {
            const evRes = await rpcGetEventByCode(savedCode, supabase);
            if (evRes.ok && evRes.data) {
              // Verify contestant claim
              const { data: cData } = await supabase
                .from('contestants')
                .select('id')
                .eq('event_id', evRes.data.id)
                .eq('auth_user_id', session.user.id)
                .single();

              if (cData) {
                router.push(`/contestant/${savedCode.toUpperCase()}`);
                return;
              }
            }
          }
        }
      } catch {
        // Continue to sign-in form
      } finally {
        setIsCheckingSession(false);
      }
    }
    checkSession();
  }, [router, supabase]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanPin = pin.trim();

    if (!cleanCode || cleanCode.length !== 5) {
      setError('Please enter a valid 5-character event code');
      return;
    }
    if (!/^[0-9]{4}$/.test(cleanPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Ensure anonymous session exists
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) {
          setError('Unable to initialize connection. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Call join_as_contestant RPC
      const res = await rpcJoinAsContestant(cleanCode, seat, cleanPin, supabase);

      if (res.ok) {
        localStorage.setItem('bible_giants_contestant_code', cleanCode);
        localStorage.setItem('bible_giants_contestant_seat', seat.toString());
        localStorage.setItem('bible_giants_contestant_id', res.data.contestant_id);
        router.push(`/contestant/${cleanCode}`);
      } else {
        setError(res.message);
        setIsLoading(false);
      }
    } catch {
      setError('Something went wrong. Please check your network and try again.');
      setIsLoading(false);
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
          <p className="text-sm">Connecting…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900">
              Bible Giants
            </h1>
            <div className="h-0.5 w-full bg-gold-500 mt-1 rounded-full" />
          </Link>
          <p className="mt-2 text-ink-500 font-medium text-sm sm:text-base">
            Contestant Podium Portal
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="w-full bg-white shadow-soft p-6 sm:p-8">
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-medium text-center"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-900">
                5-Character Event Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K2M9"
                maxLength={5}
                required
                autoFocus
                className="w-full min-h-[52px] text-center font-mono text-2xl font-extrabold uppercase tracking-widest rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-900">
                Your Assigned Seat Number
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeat(s)}
                    className={`min-h-[44px] rounded-btn font-mono text-base font-bold transition-all ${
                      seat === s
                        ? 'bg-navy-900 text-cream-50 shadow-sm ring-2 ring-gold-500'
                        : 'bg-cream-100 text-navy-900 border border-navy-700/15 hover:bg-cream-50'
                    }`}
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-900">
                4-Digit Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full min-h-[52px] text-center font-mono text-3xl font-extrabold tracking-widest rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-ink-500 text-center mt-0.5">
                Obtain your PIN from the operator at your seat.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Enter Contest
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

