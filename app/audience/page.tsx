'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rpcJoinAsAudience, rpcGetEventByCode } from '@/lib/rpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function AudienceJoinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
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
            // Verify event still exists
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
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || cleanCode.length !== 5) {
      setError('Please enter a valid 5-character event code');
      return;
    }
    if (!cleanName || cleanName.length < 1 || cleanName.length > 30) {
      setError('Please enter your name (1–30 characters)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Ensure anonymous auth session exists
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

      // 2. Call join_as_audience RPC
      const res = await rpcJoinAsAudience(cleanCode, cleanName, supabase);

      if (res.ok) {
        localStorage.setItem('bible_giants_audience_code', cleanCode);
        localStorage.setItem('bible_giants_audience_name', cleanName);
        router.push(`/audience/${cleanCode}`);
      } else {
        setError(res.message);
        setIsLoading(false);
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
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
            Audience Interactive Portal
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

            <Input
              label="Your Display Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deborah O."
              maxLength={30}
              required
            />

            <Button
              type="submit"
              variant="gold"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Join Competition
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

