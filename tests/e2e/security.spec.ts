import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qlqtujyhdbwmftogukh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscXR1anloZGJ3bWZndG9ndWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjU0NTAsImV4cCI6MjEwNDYwMTQ1MH0.YgFjtwzbv_dK7Hgul1fGuhMkRRkuL2_xKGExK_II7rU';

function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe('Security Tests (SEC-01 ... SEC-12)', () => {
  test('SEC-12: grep service_role over app/, components/, lib/ returns nothing', async () => {
    const rootDir = process.cwd();
    const targetDirs = ['app', 'components', 'lib'];

    function searchFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(searchFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('service_role')) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const matches: string[] = [];
    for (const dir of targetDirs) {
      const fullDir = path.join(rootDir, dir);
      if (fs.existsSync(fullDir)) {
        matches.push(...searchFiles(fullDir));
      }
    }

    expect(matches, `Found service_role in: ${matches.join(', ')}`).toEqual([]);
  });

  test('SEC-03: anonymous unauthenticated user calling any host_* RPC gets not_owner', async () => {
    const client = createAnonClient();
    await client.auth.signInAnonymously();

    // Call host_create_event
    const { error: err1 } = await client.rpc('host_create_event', { p_name: 'Hacked Event' });
    expect(err1).not.toBeNull();
    expect(err1?.message).toContain('not_owner');

    // Call host_set_event_status
    const { error: err2 } = await client.rpc('host_set_event_status', {
      p_event: '00000000-0000-0000-0000-000000000000',
      p_status: 'live',
    });
    expect(err2).not.toBeNull();
    expect(err2?.message).toContain('not_owner');

    // Call host_show_question
    const { error: err3 } = await client.rpc('host_show_question', {
      p_event: '00000000-0000-0000-0000-000000000000',
      p_question: '00000000-0000-0000-0000-000000000000',
    });
    expect(err3).not.toBeNull();
    expect(err3?.message).toContain('not_owner');

    // Call host_draw_raffle
    const { error: err4 } = await client.rpc('host_draw_raffle', {
      p_event: '00000000-0000-0000-0000-000000000000',
    });
    expect(err4).not.toBeNull();
    expect(err4?.message).toContain('not_owner');
  });

  test('SEC-10: contestant_secrets cannot be selected, and contestants has no pin column', async () => {
    const client = createAnonClient();
    await client.auth.signInAnonymously();

    // Direct select from contestant_secrets must fail or return empty/unauthorized
    const { data: secretData, error: secretError } = await client
      .from('contestant_secrets')
      .select('*');
    expect(secretError !== null || (secretData && secretData.length === 0)).toBe(true);

    // Verify contestants table has no pin column
    const { error: colError } = await client
      .from('contestants')
      .select('pin' as unknown as string);
    // Asking for non-existent column 'pin' should return error
    expect(colError).not.toBeNull();
  });

  test('SEC-05: direct insert/update/delete into answers, game_state, scores by client fails', async () => {
    const client = createAnonClient();
    await client.auth.signInAnonymously();

    // Direct insert into game_state must fail
    const { error: gsInsertError } = await client
      .from('game_state')
      .insert({ event_id: '00000000-0000-0000-0000-000000000000' } as any);
    expect(gsInsertError).not.toBeNull();

    // Direct update into game_state must fail
    const { error: gsUpdateError } = await client
      .from('game_state')
      .update({ question_status: 'revealed' } as any)
      .eq('event_id', '00000000-0000-0000-0000-000000000000');
    expect(gsUpdateError).not.toBeNull();

    // Direct insert into contestant_scores must fail
    const { error: scoreInsertError } = await client
      .from('contestant_scores')
      .insert({
        contestant_id: '00000000-0000-0000-0000-000000000000',
        event_id: '00000000-0000-0000-0000-000000000000',
        total_points: 9999,
      } as any);
    expect(scoreInsertError).not.toBeNull();

    // Direct insert into answers must fail (answers are written via RPC only)
    const { error: ansInsertError } = await client
      .from('answers')
      .insert({
        event_id: '00000000-0000-0000-0000-000000000000',
        question_id: '00000000-0000-0000-0000-000000000000',
        points: 100,
      } as any);
    expect(ansInsertError).not.toBeNull();
  });
});

