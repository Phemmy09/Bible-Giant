'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceDevice {
  role: 'contestant' | 'projector';
  id: string;
  name: string;
  version: number;
  updatedAt: number;
}

export interface UsePresenceClientProps {
  eventId: string | null | undefined;
  role: 'contestant' | 'projector';
  id: string;
  name: string;
  version: number;
}

/**
 * Hook for Contestants and Projector to report their applied game_state version (§9.4).
 */
export function usePresenceClient({
  eventId,
  role,
  id,
  name,
  version,
}: UsePresenceClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const versionRef = useRef(version);
  versionRef.current = version;

  useEffect(() => {
    if (!eventId || !id) return;

    const channel = supabase.channel(`presence:${eventId}`, {
      config: { presence: { key: `${role}:${id}` } },
    });
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          role,
          id,
          name,
          version: versionRef.current,
          updatedAt: Date.now(),
        });
      }
    });

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [eventId, id, name, role, supabase]);

  // Update presence whenever version changes
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.track({
        role,
        id,
        name,
        version,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
  }, [version, role, id, name]);
}

export interface LaggingDevice {
  id: string;
  name: string;
  role: 'contestant' | 'projector';
  version: number;
  secondsBehind: number;
}

export interface UsePresenceHostReturn {
  inSyncCount: number;
  totalTrackedCount: number;
  projectorConnected: boolean;
  laggingDevices: LaggingDevice[];
}

/**
 * Hook for Operator console to track in-sync devices and projector connectivity (§9.4).
 */
export function usePresenceHost(
  eventId: string | null | undefined,
  currentVersion: number
): UsePresenceHostReturn {
  const supabase = useMemo(() => createClient(), []);
  const [devices, setDevices] = useState<PresenceDevice[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase.channel(`presence:${eventId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceDevice>();
        const flatDevices: PresenceDevice[] = [];

        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p && p.role && p.id) {
              flatDevices.push(p);
            }
          });
        });

        setDevices(flatDevices);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase]);

  const { inSyncCount, totalTrackedCount, projectorConnected, laggingDevices } = useMemo(() => {
    let inSync = 0;
    let projConnected = false;
    const lagging: LaggingDevice[] = [];
    const now = Date.now();

    devices.forEach((d) => {
      if (d.role === 'projector') {
        projConnected = true;
      }

      if (d.version >= currentVersion) {
        inSync += 1;
      } else {
        const secondsBehind = Math.max(1, Math.round((now - (d.updatedAt || now)) / 1000));
        lagging.push({
          id: d.id,
          name: d.name || (d.role === 'projector' ? 'Projector Screen' : `Contestant ${d.id}`),
          role: d.role,
          version: d.version,
          secondsBehind,
        });
      }
    });

    return {
      inSyncCount: inSync,
      totalTrackedCount: devices.length,
      projectorConnected: projConnected,
      laggingDevices: lagging,
    };
  }, [devices, currentVersion]);

  return {
    inSyncCount,
    totalTrackedCount,
    projectorConnected,
    laggingDevices,
  };
}
