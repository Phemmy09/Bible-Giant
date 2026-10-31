'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { rpcServerTime } from '@/lib/rpc';
import { createClient } from '@/lib/supabase/client';

export function useServerClock() {
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const supabase = createClient();
  const offsetRef = useRef<number>(0);

  const syncClock = useCallback(async () => {
    let bestLatency = Infinity;
    let bestOffset = 0;

    // Call server_time() 3 times on load, keep lowest-latency sample
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      const res = await rpcServerTime(supabase);
      const t1 = Date.now();

      if (res.ok && res.data) {
        const roundTrip = t1 - t0;
        const serverMs = new Date(res.data).getTime();
        const clientMid = t0 + roundTrip / 2;
        const offset = serverMs - clientMid;

        if (roundTrip < bestLatency) {
          bestLatency = roundTrip;
          bestOffset = offset;
        }
      }
    }

    if (bestLatency !== Infinity) {
      offsetRef.current = bestOffset;
      setServerOffsetMs(bestOffset);
      setIsSynced(true);
    }
  }, [supabase]);

  useEffect(() => {
    syncClock();
    // Refresh offset every 60 seconds
    const interval = setInterval(syncClock, 60000);
    return () => clearInterval(interval);
  }, [syncClock]);

  const getServerNow = useCallback(() => {
    return Date.now() + offsetRef.current;
  }, []);

  return { serverOffsetMs, isSynced, getServerNow, syncClock };
}

