import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_EVENT_ID } from '@/lib/defaultEvent';
import { getAudienceLeaderboard } from '@/lib/audienceRegistry';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || DEFAULT_EVENT_ID;

    // 1. Get from local audience registry
    const registryList = getAudienceLeaderboard(eventId);

    // 2. Also try fetching from Supabase if available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    let dbScores: any[] = [];

    if (supabaseUrl && adminKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data } = await adminSupabase
          .from('audience_scores')
          .select('*')
          .eq('event_id', eventId)
          .order('total_points', { ascending: false })
          .order('correct_count', { ascending: false })
          .order('correct_ms', { ascending: true });

        if (data && data.length > 0) {
          dbScores = data;
        }
      } catch (err) {
        console.warn('Leaderboard fetch warning:', err);
      }
    }

    // Merge or fallback to registry list
    const effectiveList = registryList.length > 0 ? registryList : dbScores;

    const top5 = effectiveList.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      id: item.id || item.audience_id,
      name: item.name || item.display_name,
      phone: item.phone || '',
      region: item.region || 'General',
      total_points: item.total_points || 0,
      correct_count: item.correct_count || 0,
      correct_ms: item.correct_ms || 0,
    }));

    return NextResponse.json({
      ok: true,
      top5,
      all: effectiveList,
      total_registered: effectiveList.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
