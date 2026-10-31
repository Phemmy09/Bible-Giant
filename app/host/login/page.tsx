'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const HARDCODED_OPERATOR_EMAIL = 'mailizzy02@gmail.com';
const HARDCODED_OPERATOR_PASSWORD = 'Admin1234@';

export default function OperatorLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const inputEmail = email.trim() || HARDCODED_OPERATOR_EMAIL;
    const inputPassword = password;

    const allowedPassword =
      process.env.NEXT_PUBLIC_OPERATOR_PASSWORD || HARDCODED_OPERATOR_PASSWORD;

    // Hardcoded password verification
    if (inputPassword !== allowedPassword && inputPassword !== HARDCODED_OPERATOR_PASSWORD) {
      setError('Wrong email or password');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Set client-side session cookie immediately
      document.cookie = 'operator_session=1; path=/; max-age=604800; SameSite=Lax';

      // 2. Call server auth endpoint to set HTTP-only cookie and sync with Supabase Auth
      try {
        await fetch('/api/auth/operator-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inputEmail, password: inputPassword }),
        });
      } catch (apiErr) {
        console.warn('API operator login error:', apiErr);
      }

      // 3. Attempt Supabase client sign-in so auth.uid() is active for Supabase RPCs
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: inputEmail,
          password: inputPassword,
        });

        if (signInErr) {
          // If not registered yet, attempt signUp
          await supabase.auth.signUp({
            email: inputEmail,
            password: inputPassword,
          });
        }
      } catch (sbErr) {
        console.warn('Supabase client auth warning:', sbErr);
      }

      // 4. Session established — navigate to host overview
      router.push('/host');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error logging in';
      setError(msg);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900">
              Bible Giants
            </h1>
            <div className="h-0.5 w-full bg-gold-500 mt-1 rounded-full" />
          </Link>
          <p className="mt-2 text-ink-500 font-medium text-base">
            Operator Console Sign In
          </p>
        </div>

        {/* Login Card */}
        <Card className="w-full shadow-soft bg-white p-6 sm:p-8">
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-btn bg-danger/10 border border-danger/20 text-danger text-sm font-medium"
              >
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@example.com"
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>
        </Card>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-ink-500 hover:text-navy-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
