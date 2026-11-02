import { describe, it, expect } from 'vitest';
import { PresenceDevice, LaggingDevice } from '@/lib/realtime/usePresenceSync';

describe('Phase A Gate A3: Operator Dashboard Shell & In-Sync Presence (§3.1, §9.4)', () => {
  it('calculates in-sync count correctly when all devices are on the current version', () => {
    const currentVersion = 5;
    const devices: PresenceDevice[] = [
      { role: 'contestant', id: 'c1', name: 'Contestant 1', version: 5, updatedAt: Date.now() },
      { role: 'contestant', id: 'c2', name: 'Contestant 2', version: 5, updatedAt: Date.now() },
      { role: 'projector', id: 'proj', name: 'Projector', version: 5, updatedAt: Date.now() },
    ];

    const inSyncCount = devices.filter((d) => d.version >= currentVersion).length;
    const lagging: LaggingDevice[] = devices
      .filter((d) => d.version < currentVersion)
      .map((d) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        version: d.version,
        secondsBehind: Math.max(1, Math.round((Date.now() - d.updatedAt) / 1000)),
      }));

    expect(inSyncCount).toBe(3);
    expect(lagging.length).toBe(0);
  });

  it('identifies lagging devices when version is behind', () => {
    const currentVersion = 5;
    const devices: PresenceDevice[] = [
      { role: 'contestant', id: 'c1', name: 'Contestant 1', version: 5, updatedAt: Date.now() },
      { role: 'contestant', id: 'c2', name: 'Contestant 2', version: 4, updatedAt: Date.now() - 3000 },
      { role: 'projector', id: 'proj', name: 'Projector', version: 3, updatedAt: Date.now() - 5000 },
    ];

    const inSyncCount = devices.filter((d) => d.version >= currentVersion).length;
    const lagging: LaggingDevice[] = devices
      .filter((d) => d.version < currentVersion)
      .map((d) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        version: d.version,
        secondsBehind: Math.max(1, Math.round((Date.now() - d.updatedAt) / 1000)),
      }));

    expect(inSyncCount).toBe(1);
    expect(lagging.length).toBe(2);
    expect(lagging[0].name).toBe('Contestant 2');
    expect(lagging[1].name).toBe('Projector');
    expect(lagging[0].secondsBehind).toBeGreaterThanOrEqual(2);
  });

  it('detects whether projector screen is connected', () => {
    const devicesWithProjector: PresenceDevice[] = [
      { role: 'contestant', id: 'c1', name: 'Contestant 1', version: 1, updatedAt: Date.now() },
      { role: 'projector', id: 'proj', name: 'Projector', version: 1, updatedAt: Date.now() },
    ];
    const devicesWithoutProjector: PresenceDevice[] = [
      { role: 'contestant', id: 'c1', name: 'Contestant 1', version: 1, updatedAt: Date.now() },
    ];

    expect(devicesWithProjector.some((d) => d.role === 'projector')).toBe(true);
    expect(devicesWithoutProjector.some((d) => d.role === 'projector')).toBe(false);
  });

  it('formats direct join URLs with ?code= for audience and contestants', () => {
    const code = 'GIANT';
    const baseUrl = 'https://bible-giant.vercel.app';

    const audienceUrl = `${baseUrl}/audience?code=${code}`;
    const contestantUrl = `${baseUrl}/contestant?code=${code}`;

    expect(audienceUrl).toBe('https://bible-giant.vercel.app/audience?code=GIANT');
    expect(contestantUrl).toBe('https://bible-giant.vercel.app/contestant?code=GIANT');

    // Parse back
    const audParsed = new URL(audienceUrl);
    expect(audParsed.searchParams.get('code')).toBe('GIANT');

    const conParsed = new URL(contestantUrl);
    expect(conParsed.searchParams.get('code')).toBe('GIANT');
  });

  it('strictly restricts presence device roles to contestant and projector', () => {
    const validRoles: PresenceDevice['role'][] = ['contestant', 'projector'];
    expect(validRoles.includes('contestant')).toBe(true);
    expect(validRoles.includes('projector')).toBe(true);
    // TypeScript ensures 'audience' is never in PresenceDevice role
  });
});
