'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rpcJoinAsAudience } from '@/lib/rpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function AudienceJoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [assembly, setAssembly] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Read URL query code and local session
  useEffect(() => {
    try {
      const urlCode = searchParams.get('code');
      const savedCode = localStorage.getItem('bible_giants_audience_code');
      const savedName = localStorage.getItem('bible_giants_audience_name');
      const savedAssembly = localStorage.getItem('bible_giants_audience_assembly');
      const savedPhone = localStorage.getItem('bible_giants_audience_phone');

      if (urlCode) {
        setCode(urlCode.trim().toUpperCase());
      } else if (savedCode) {
        setCode(savedCode);
      }

      if (savedName) setName(savedName);
      if (savedAssembly) setAssembly(savedAssembly);
      if (savedPhone) setPhone(savedPhone);
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsCheckingSession(false);
    }
  }, [searchParams]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanAssembly = assembly.trim();
    const cleanPhone = phone.trim();

    if (!cleanCode || cleanCode.length !== 5) {
      setError('Please enter the 5-character event code');
      return;
    }
    if (!cleanName || cleanName.length < 1 || cleanName.length > 30) {
      setError('Please enter your name (1–30 characters)');
      return;
    }
    if (!cleanAssembly || cleanAssembly.length < 1 || cleanAssembly.length > 60) {
      setError('Please enter your assembly or church (1–60 characters)');
      return;
    }
    if (cleanPhone && (cleanPhone.length < 7 || cleanPhone.length > 20 || !/^[0-9+ -]+$/.test(cleanPhone))) {
      setError('Phone number must be between 7 and 20 digits (digits, spaces, +, -)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Authenticate anonymously with Supabase if needed so auth.uid() is set
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          await supabase.auth.signInAnonymously();
        }
      } catch (authErr) {
        console.warn('Anonymous sign-in note:', authErr);
      }

      // 2. Call Supabase RPC join_as_audience
      let audienceMemberId = `aud-${Date.now()}`;
      try {
        const rpcRes = await rpcJoinAsAudience(cleanCode, cleanName, cleanAssembly, cleanPhone || null, supabase);
        if (rpcRes.ok && rpcRes.data) {
          audienceMemberId = rpcRes.data;
        } else if (!rpcRes.ok && rpcRes.code !== 'no_event') {
          // If RPC returned a specific error (e.g. audience_full, bad_name), inform user
          setError(rpcRes.message);
          setIsLoading(false);
          return;
        }
      } catch (rpcErr) {
        console.warn('RPC join warning:', rpcErr);
      }

      // 3. Sync with server-side endpoint
      try {
        const res = await fetch('/api/audience/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleanCode,
            name: cleanName,
            assembly: cleanAssembly,
            phone: cleanPhone || null,
          }),
        });
        const regData = await res.json().catch(() => ({}));
        if (regData.audience_id) {
          audienceMemberId = regData.audience_id;
        }
      } catch (apiErr) {
        console.warn('API registration warning:', apiErr);
      }

      // 4. Save session locally
      localStorage.setItem('bible_giants_audience_code', cleanCode);
      localStorage.setItem('bible_giants_audience_name', cleanName);
      localStorage.setItem('bible_giants_audience_assembly', cleanAssembly);
      if (cleanPhone) {
        localStorage.setItem('bible_giants_audience_phone', cleanPhone);
      } else {
        localStorage.removeItem('bible_giants_audience_phone');
      }
      localStorage.setItem('bible_giants_audience_id', audienceMemberId);

      // 5. Navigate to audience live view
      router.push(`/audience/${cleanCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error joining event';
      setError(msg);
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-ink-500">
          <svg className="animate-spin h-6 w-6 text-gold-500" fill="none" viewBox="0 0 24 24">
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
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
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
              <label htmlFor="event-code" className="text-sm font-semibold text-navy-900">
                Event Code
              </label>
              <input
                id="event-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter 5-character code"
                maxLength={5}
                required
                className="w-full min-h-[46px] text-center font-mono text-xl font-extrabold uppercase tracking-widest rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display-name" className="text-sm font-semibold text-navy-900">
                Your Name <span className="text-danger">*</span>
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bro. David Adeyemi"
                maxLength={30}
                required
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Assembly / Church */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assembly" className="text-sm font-semibold text-navy-900">
                Your Assembly / Church <span className="text-danger">*</span>
              </label>
              <input
                id="assembly"
                type="text"
                value={assembly}
                onChange={(e) => setAssembly(e.target.value)}
                placeholder="e.g. Ado Central, Akure, Ikole"
                maxLength={60}
                required
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Phone Number (Optional) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="phone" className="text-sm font-semibold text-navy-900">
                  Phone Number <span className="text-xs font-normal text-ink-500">(Optional)</span>
                </label>
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0801 234 5678"
                maxLength={20}
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Mandatory plain note per §6.1 */}
            <p className="text-xs text-ink-500 bg-cream-50 p-3 rounded-btn border border-navy-700/10 leading-relaxed">
              Your name and assembly are shown to the organisers and your name may appear on the big screen. Phone number is optional.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-1"
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

export default function AudienceJoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-ink-500">
            <p className="text-sm">Loading…</p>
          </div>
        </main>
      }
    >
      <AudienceJoinForm />
    </Suspense>
  );
}
