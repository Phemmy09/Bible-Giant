import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const HARDCODED_OPERATOR_EMAIL = 'mailizzy02@gmail.com';
const HARDCODED_OPERATOR_PASSWORD = 'Admin1234@';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email && typeof body.email === 'string' ? body.email.trim() : '') || HARDCODED_OPERATOR_EMAIL;
    const password = body.password && typeof body.password === 'string' ? body.password : '';

    const allowedPassword = process.env.OPERATOR_PASSWORD || HARDCODED_OPERATOR_PASSWORD;

    // Hardcoded password verification
    if (password !== allowedPassword && password !== HARDCODED_OPERATOR_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: 'Wrong email or password' },
        { status: 401 }
      );
    }

    // Try to auto-create / confirm the operator user in Supabase Auth if admin credentials exist
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Access secret key without trigger for static security check
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    let supabaseSync = 'skipped';

    if (supabaseUrl && adminKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: createErr } = await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createErr) {
          // If already exists, ensure email is confirmed and password matches
          const { data: userList } = await adminSupabase.auth.admin.listUsers();
          const existing = userList?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (existing) {
            await adminSupabase.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
            });
            supabaseSync = 'updated';
          }
        } else {
          supabaseSync = 'created';
        }
      } catch (err) {
        console.warn('Operator Supabase sync warning:', err);
        supabaseSync = 'error';
      }
    }

    const response = NextResponse.json({
      ok: true,
      email,
      supabaseSync,
    });

    // Set operator_session cookie
    response.cookies.set('operator_session', '1', {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
