'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rpcJoinAsContestant, rpcGetEventByCode } from '@/lib/rpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  DEFAULT_EVENT_CODE,
  DEFAULT_CONTESTANT_PIN,
  DEFAULT_CONTESTANTS,
} from '@/lib/defaultEvent';

const EKITI_ZONES = ['Ado-Ekiti', 'Ikole', 'Ijero', 'Oye', 'Ikere', 'Ekiti West'];
const ONDO_ZONES = ['Akure', 'Owo', 'Ikare', 'Ondo Central', 'Ore', 'Okitipupa'];

export default function ContestantSignInPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState('');
  const [seat, setSeat] = useState<number>(1);
  const [pin, setPin] = useState('');

  // Participant Name, State & Zone
  const [name, setName] = useState('');
  const [state, setState] = useState<'Ekiti' | 'Ondo'>('Ekiti');
  const [zone, setZone] = useState('Ado-Ekiti');
  const [customZone, setCustomZone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Sync default name and zone when seat or state changes
  useEffect(() => {
    const defaultForSeat = DEFAULT_CONTESTANTS.find((c) => c.seat_no === seat);
    if (defaultForSeat && !name) {
      setName(defaultForSeat.name);
      if (defaultForSeat.group_label?.includes('Ondo')) {
        setState('Ondo');
        const z = defaultForSeat.group_label.split('•')[0]?.trim();
        setZone(z || 'Akure');
      } else {
        setState('Ekiti');
        const z = defaultForSeat.group_label?.split('•')[0]?.trim();
        setZone(z || 'Ado-Ekiti');
      }
    }
  }, [seat, name]);

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
    const cleanCode = code.trim().toUpperCase() || DEFAULT_EVENT_CODE;
    const cleanPin = pin.trim() || DEFAULT_CONTESTANT_PIN;
    const contestantName = name.trim() || `Contestant Seat ${seat}`;
    const effectiveZone = (customZone.trim() || zone).trim();
    const groupLabel = `${effectiveZone} • ${state}`;

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
      // 1. Ensure anonymous session exists if Supabase is connected
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          await supabase.auth.signInAnonymously();
        }
      } catch {
        // Fallback for offline mode
      }

      // 2. Call join_as_contestant RPC
      const res = await rpcJoinAsContestant(cleanCode, seat, cleanPin, supabase);

      // Save contestant profile locally
      localStorage.setItem('bible_giants_contestant_code', cleanCode);
      localStorage.setItem('bible_giants_contestant_seat', seat.toString());
      localStorage.setItem('bible_giants_contestant_id', res.ok ? res.data.contestant_id : `c-${seat}`);
      localStorage.setItem('bible_giants_contestant_name', contestantName);
      localStorage.setItem('bible_giants_contestant_state', state);
      localStorage.setItem('bible_giants_contestant_zone', effectiveZone);
      localStorage.setItem('bible_giants_contestant_group', groupLabel);

      // 3. Update contestant profile in Supabase if claimed
      if (res.ok && res.data?.contestant_id) {
        try {
          await supabase
            .from('contestants')
            .update({
              name: contestantName,
              group_label: groupLabel,
            })
            .eq('id', res.data.contestant_id);
        } catch {
          // Non-blocking update
        }
      }

      // Proceed to live stage
      router.push(`/contestant/${cleanCode}`);
    } catch {
      // If error occurs, still allow with hardcoded access
      localStorage.setItem('bible_giants_contestant_code', cleanCode);
      localStorage.setItem('bible_giants_contestant_seat', seat.toString());
      localStorage.setItem('bible_giants_contestant_id', `c-${seat}`);
      localStorage.setItem('bible_giants_contestant_name', contestantName);
      localStorage.setItem('bible_giants_contestant_state', state);
      localStorage.setItem('bible_giants_contestant_zone', effectiveZone);
      localStorage.setItem('bible_giants_contestant_group', groupLabel);
      router.push(`/contestant/${cleanCode}`);
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
          <p className="text-sm">Connecting to Bible Giants stage…</p>
        </div>
      </main>
    );
  }

  const currentZoneList = state === 'Ekiti' ? EKITI_ZONES : ONDO_ZONES;

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md sm:max-w-lg flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900">
              Bible Giants
            </h1>
            <div className="h-0.5 w-full bg-gold-500 mt-1 rounded-full" />
          </Link>
          <p className="mt-2 text-ink-500 font-medium text-sm sm:text-base">
            Contestant Podium Portal — Ondo & Ekiti Region
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
                className="w-full min-h-[48px] text-center font-mono text-xl font-extrabold uppercase tracking-widest rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Seat Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Assigned Seat Number
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
                    Seat #{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Contestant Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Participant Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emmanuel Adeyemi"
                required
                className="w-full min-h-[44px] px-3.5 text-base font-medium rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* State Selection: Ondo vs Ekiti */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                State (Ondo / Ekiti)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setState('Ekiti');
                    setZone(EKITI_ZONES[0]);
                  }}
                  className={`min-h-[46px] rounded-btn font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                    state === 'Ekiti'
                      ? 'bg-gold-500 text-navy-900 border-gold-600 font-bold shadow-sm ring-2 ring-gold-400'
                      : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                  }`}
                >
                  <span className="text-lg">🏛️</span>
                  Ekiti State
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setState('Ondo');
                    setZone(ONDO_ZONES[0]);
                  }}
                  className={`min-h-[46px] rounded-btn font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                    state === 'Ondo'
                      ? 'bg-gold-500 text-navy-900 border-gold-600 font-bold shadow-sm ring-2 ring-gold-400'
                      : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-50'
                  }`}
                >
                  <span className="text-lg">🌴</span>
                  Ondo State
                </button>
              </div>
            </div>

            {/* Zone Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
                Zone / Branch ({state})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {currentZoneList.map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => {
                      setZone(z);
                      setCustomZone('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-chip border transition-all ${
                      zone === z && !customZone
                        ? 'bg-navy-900 text-cream-50 border-navy-900 shadow-xs'
                        : 'bg-cream-100 text-ink-700 border-navy-700/15 hover:bg-cream-200'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                placeholder="Or type custom zone / branch here..."
                className="w-full min-h-[40px] px-3.5 text-sm rounded-btn bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Security PIN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy-900">
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
                className="w-full min-h-[48px] text-center font-mono text-2xl font-extrabold tracking-widest rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Enter Contest (Seat #{seat})
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
