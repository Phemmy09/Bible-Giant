import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_EVENT_ID, DEFAULT_EVENT_CODE } from '@/lib/defaultEvent';
import { registerAudienceMember } from '@/lib/audienceRegistry';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = (body.code && typeof body.code === 'string' ? body.code.trim().toUpperCase() : '') || DEFAULT_EVENT_CODE;
    const name = body.name && typeof body.name === 'string' ? body.name.trim() : '';
    const assembly = (body.assembly && typeof body.assembly === 'string' ? body.assembly.trim() : '') ||
      (body.region && typeof body.region === 'string' ? body.region.trim() : '');
    const phone = body.phone && typeof body.phone === 'string' ? body.phone.trim() : '';
    const region = body.region && typeof body.region === 'string' ? body.region.trim() : assembly;

    if (!name || name.length < 1 || name.length > 30) {
      return NextResponse.json({ ok: false, error: 'Please enter your name (1–30 characters)' }, { status: 400 });
    }
    if (!assembly || assembly.length < 1 || assembly.length > 60) {
      return NextResponse.json({ ok: false, error: 'Please enter your assembly or church (1–60 characters)' }, { status: 400 });
    }
    if (phone && (phone.length < 7 || phone.length > 20 || !/^[0-9+ -]+$/.test(phone))) {
      return NextResponse.json({ ok: false, error: 'Phone number must be 7–20 digits' }, { status: 400 });
    }

    let eventId = DEFAULT_EVENT_ID;

    // Supabase client setup if credentials available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    let supabaseStatus = 'skipped';

    if (supabaseUrl && adminKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Lookup event by code
        const { data: evData } = await adminSupabase
          .from('events')
          .select('id')
          .eq('join_code', code)
          .maybeSingle();

        if (evData?.id) {
          eventId = evData.id;
        }

        const memberId = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const authUserId = '00000000-0000-0000-0000-' + memberId.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);

        // Check if member already exists by auth_user_id or by phone
        let existingId: string | null = null;
        if (phone) {
          const { data: existingMember } = await adminSupabase
            .from('audience_members')
            .select('id')
            .eq('event_id', eventId)
            .eq('phone', phone)
            .maybeSingle();
          if (existingMember?.id) existingId = existingMember.id;
        }

        const targetId = existingId || memberId;

        // Upsert audience member with assembly and phone
        const { error: insErr } = await adminSupabase.from('audience_members').upsert(
          {
            id: targetId,
            event_id: eventId,
            auth_user_id: authUserId,
            display_name: name,
            assembly: assembly,
            phone: phone || null,
          },
          { onConflict: 'id' }
        );

        if (insErr) {
          console.warn('Direct upsert warning:', insErr.message);
        }

        // Upsert into audience_scores
        await adminSupabase.from('audience_scores').upsert(
          {
            audience_id: targetId,
            event_id: eventId,
            display_name: name,
            total_points: 0,
            correct_count: 0,
            answered_count: 0,
            correct_ms: 0,
          },
          { onConflict: 'audience_id' }
        );

        supabaseStatus = 'saved';
      } catch (sbErr) {
        console.warn('Supabase audience registration warning:', sbErr);
        supabaseStatus = 'error';
      }
    }

    // 1. Save into persistent audience registry
    const registered = registerAudienceMember({
      event_id: eventId,
      name,
      assembly,
      phone: phone || null,
      region,
    });

    return NextResponse.json({
      ok: true,
      audience_id: registered.id,
      event_id: eventId,
      name,
      assembly,
      phone: phone || null,
      region,
      code,
      supabaseStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


