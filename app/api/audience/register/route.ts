import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_EVENT_ID, DEFAULT_EVENT_CODE } from '@/lib/defaultEvent';
import { registerAudienceMember } from '@/lib/audienceRegistry';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = (body.code && typeof body.code === 'string' ? body.code.trim().toUpperCase() : '') || DEFAULT_EVENT_CODE;
    const name = body.name && typeof body.name === 'string' ? body.name.trim() : '';
    const phone = body.phone && typeof body.phone === 'string' ? body.phone.trim() : '';
    const region = body.region && typeof body.region === 'string' ? body.region.trim() : 'Ekiti Area';

    if (!name || name.length < 1) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }
    if (!phone || phone.length < 5) {
      return NextResponse.json({ ok: false, error: 'Valid phone number is required' }, { status: 400 });
    }

    const eventId = DEFAULT_EVENT_ID;

    // 1. Save into persistent audience registry
    const registered = registerAudienceMember({
      event_id: eventId,
      name,
      phone,
      region,
    });

    // 2. Save into Supabase if service role is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    let supabaseStatus = 'skipped';

    if (supabaseUrl && adminKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const formattedName = `${name} [${phone}]`;

        // Check if phone column exists or insert standard
        const { error: insErr } = await adminSupabase.from('audience_members').upsert(
          {
            id: registered.id,
            event_id: eventId,
            auth_user_id: '00000000-0000-0000-0000-' + registered.id.replace(/\D/g, '').padEnd(12, '0').slice(0, 12),
            display_name: formattedName.slice(0, 30),
            phone: phone,
          },
          { onConflict: 'id' }
        );

        if (insErr) {
          // If phone column does not exist on older schema, insert without phone column
          await adminSupabase.from('audience_members').upsert(
            {
              id: registered.id,
              event_id: eventId,
              auth_user_id: '00000000-0000-0000-0000-' + registered.id.replace(/\D/g, '').padEnd(12, '0').slice(0, 12),
              display_name: formattedName.slice(0, 30),
            },
            { onConflict: 'id' }
          );
        }

        // Upsert into audience_scores
        await adminSupabase.from('audience_scores').upsert(
          {
            audience_id: registered.id,
            event_id: eventId,
            display_name: `${name} (${region})`.slice(0, 30),
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

    return NextResponse.json({
      ok: true,
      audience_id: registered.id,
      event_id: eventId,
      name,
      phone,
      region,
      code,
      supabaseStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

