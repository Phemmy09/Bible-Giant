'use client';

import React, { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
      setJustReconnected(false);
    }

    function handleOnline() {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }

    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="w-full bg-danger text-cream-50 py-2.5 px-4 text-center text-xs sm:text-sm font-semibold sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md animate-fade-in"
      >
        <span>⚠️</span>
        <span>
          You are currently offline. Check your Wi-Fi or mobile data; the app will automatically reconnect.
        </span>
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-success text-cream-50 py-2 px-4 text-center text-xs sm:text-sm font-semibold sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md animate-fade-in"
      >
        <span>✓</span>
        <span>Connection restored! Resynchronizing live quiz data…</span>
      </div>
    );
  }

  return null;
}

