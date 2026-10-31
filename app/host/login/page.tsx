'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !data.user) {
        setError(authError?.message || 'Wrong email or password');
        setIsLoading(false);
        return;
      }

      router.push('/host');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error. Please try again.';
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

