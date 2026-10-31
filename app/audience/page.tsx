'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AudienceJoinPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState<'Ekiti Area' | 'Ondo Area' | 'General'>('Ekiti Area');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // If already registered in this session, prefill or redirect
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem('bible_giants_audience_code');
      const savedName = localStorage.getItem('bible_giants_audience_name');
      const savedPhone = localStorage.getItem('bible_giants_audience_phone');

      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
      if (savedCode) setCode(savedCode);
    } catch {
      // Ignore
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanCode || cleanCode.length !== 5) {
      setError('Please enter the 5-character event code provided by the coordinator');
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name');
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid phone number so organizers can contact you for prize awards');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register with the server endpoint
      const res = await fetch('/api/audience/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          name: cleanName,
          phone: cleanPhone,
          region,
        }),
      });

      const data = await res.json().catch(() => ({}));

      const audienceId = data.audience_id || `aud-${Date.now()}`;

      // Save audience session locally
      localStorage.setItem('bible_giants_audience_code', cleanCode);
      localStorage.setItem('bible_giants_audience_name', cleanName);
      localStorage.setItem('bible_giants_audience_phone', cleanPhone);
      localStorage.setItem('bible_giants_audience_region', region);
      localStorage.setItem('bible_giants_audience_id', audienceId);

      // Navigate to live audience stage
      router.push(`/audience/${cleanCode}`);
    } catch {
      // Even if network blips, allow audience in with local storage session
      const fallbackId = `aud-${Date.now()}`;
      localStorage.setItem('bible_giants_audience_code', cleanCode);
      localStorage.setItem('bible_giants_audience_name', cleanName);
      localStorage.setItem('bible_giants_audience_phone', cleanPhone);
      localStorage.setItem('bible_giants_audience_region', region);
      localStorage.setItem('bible_giants_audience_id', fallbackId);
      router.push(`/audience/${cleanCode}`);
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
              <label className="text-sm font-semibold text-navy-900">
                Event Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter 5-character event code"
                maxLength={5}
                required
                className="w-full min-h-[46px] text-center font-mono text-xl font-extrabold uppercase tracking-widest rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. David Adeyemi"
                maxLength={50}
                required
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-navy-900">
                  Phone Number
                </label>
                <span className="text-[11px] text-gold-900 font-medium">
                  For Top 5 Prize Contact
                </span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0801 234 5678"
                maxLength={20}
                required
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-[11px] text-ink-500">
                Top 5 highest scoring audience participants will be awarded at the end of the competition.
              </p>
            </div>

            {/* Region / Area Tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Region / Area
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Ekiti Area', 'Ondo Area', 'General'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`min-h-[40px] text-xs font-bold rounded-btn border transition-all ${
                      region === r
                        ? 'bg-navy-900 text-cream-50 border-navy-900 shadow-sm'
                        : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
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
