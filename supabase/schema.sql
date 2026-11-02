-- =====================================================================
-- BIBLE GIANTS — supabase/schema.sql
-- Run ONCE in the Supabase SQL Editor on a FRESH project.
-- Before running: Authentication -> Providers -> enable "Anonymous sign-ins".
-- Create the operator user in Authentication -> Users (email + password).
-- Error convention: RPCs raise exceptions whose MESSAGE is the error code
-- (e.g. 'bad_state'). join_as_contestant and submit_answer RETURN jsonb
-- instead of raising (so counters/rollback behave correctly).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- ENUMS ----------
create type public.event_status as enum ('setup','predictions_open','predictions_locked','live','finished');
create type public.round_type as enum ('speed','individual');
create type public.question_status as enum ('hidden','shown','open','locked','revealed');
create type public.screen_mode as enum ('lobby','predictions','question','answer','leaderboard','winner','raffle','blank','round_summary','audience_board');

-- ---------- TABLES ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique,
  status public.event_status not null default 'setup',
  max_audience int not null default 120 check (max_audience between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.contestants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  seat_no int not null check (seat_no between 1 and 8),
  name text not null check (char_length(name) between 1 and 60),
  group_label text check (group_label is null or char_length(group_label) <= 60),
  photo_url text,
  auth_user_id uuid,
  claimed_at timestamptz,
  unique (event_id, seat_no)
);

-- secrets live apart so NO client can ever select them (no grants at all)
create table public.contestant_secrets (
  contestant_id uuid primary key references public.contestants(id) on delete cascade,
  pin_hash text not null,
  failed_pins int not null default 0
);

create table public.audience_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  auth_user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 30),
  assembly text not null check (char_length(btrim(assembly)) between 1 and 60),
  phone text check (phone is null or (char_length(btrim(phone)) between 7 and 20 and btrim(phone) ~ '^[0-9+ -]+$')),
  joined_at timestamptz not null default now(),
  unique (event_id, auth_user_id)
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  position int not null check (position >= 1),
  title text not null check (char_length(title) between 1 and 80),
  type public.round_type not null default 'speed',
  max_points int not null default 100 check (max_points between 1 and 1000),
  min_points int not null default 40 check (min_points between 0 and 1000),
  time_limit_sec int not null default 20 check (time_limit_sec between 3 and 300),
  wrong_penalty int not null default 0 check (wrong_penalty between 0 and 1000),
  first_correct_bonus int not null default 0 check (first_correct_bonus between 0 and 1000),
  audience_can_answer boolean not null default true,
  unique (event_id, position),
  check (type = 'individual' or min_points <= max_points)  -- min_points only matters for speed rounds
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  position int not null check (position >= 1),
  body text not null check (char_length(body) between 3 and 400),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5),
  scripture_ref text,
  image_url text,
  answer_mode text not null default 'choice' check (answer_mode in ('choice','spoken')),
  assigned_contestant_id uuid references public.contestants(id) on delete set null,
  points_override int check (points_override is null or points_override between 1 and 1000),
  unique (round_id, position)
);
-- options format: [{"key":"A","text":"..."},{"key":"B","text":"..."}]  keys A..E, unique

create table public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  correct_key text check (correct_key is null or correct_key in ('A','B','C','D','E')),
  explanation text
);

create table public.game_state (
  event_id uuid primary key references public.events(id) on delete cascade,
  current_round_id uuid references public.rounds(id) on delete set null,
  current_question_id uuid references public.questions(id) on delete set null,
  summary_round_id uuid references public.rounds(id) on delete set null,
  question_status public.question_status not null default 'hidden',
  screen public.screen_mode not null default 'lobby',
  opened_at timestamptz,
  closes_at timestamptz,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  contestant_id uuid references public.contestants(id) on delete cascade,
  audience_id uuid references public.audience_members(id) on delete cascade,
  choice_key text,
  submitted_at timestamptz not null default now(),
  elapsed_ms int,
  is_correct boolean,
  points int not null default 0,
  check (((contestant_id is not null)::int + (audience_id is not null)::int) = 1),
  unique (question_id, contestant_id),
  unique (question_id, audience_id)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  audience_id uuid not null unique references public.audience_members(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.contestant_scores (
  contestant_id uuid primary key references public.contestants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  total_points int not null default 0,
  correct_count int not null default 0,
  answered_count int not null default 0,
  correct_ms bigint not null default 0
);

create table public.audience_scores (
  audience_id uuid primary key references public.audience_members(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null,
  total_points int not null default 0,
  correct_count int not null default 0,
  answered_count int not null default 0,
  correct_ms bigint not null default 0
);

create table public.score_adjustments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  contestant_id uuid not null references public.contestants(id) on delete cascade,
  delta int not null check (delta between -1000 and 1000 and delta <> 0),
  reason text not null check (char_length(btrim(reason)) >= 3),
  created_at timestamptz not null default now()
);

create table public.raffle_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  audience_id uuid references public.audience_members(id) on delete set null,
  winner_name text not null,
  pool_kind text not null check (pool_kind in ('correct_predictors','all_audience')),
  pool_size int not null,
  drawn_at timestamptz not null default now()
);

create index on public.answers (question_id);
create index on public.answers (event_id);
create index on public.audience_members (event_id);
create index on public.questions (round_id);
create index on public.predictions (event_id);
create index on public.contestants (event_id);

-- ---------- HELPERS ----------
create or replace function public.is_host() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create or replace function public.is_event_owner(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_host() and exists (select 1 from public.events e where e.id = p_event and e.owner_id = auth.uid())
$$;

create or replace function public.my_contestant_id(p_event uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.contestants c where c.event_id = p_event and c.auth_user_id = auth.uid() limit 1
$$;

create or replace function public.my_audience_id(p_event uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.audience_members m where m.event_id = p_event and m.auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_event_member(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_contestant_id(p_event) is not null or public.my_audience_id(p_event) is not null
$$;

create or replace function public.assert_event_owner(p_event uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_event_owner(p_event) then raise exception 'not_owner'; end if;
end $$;

create or replace function public.gen_join_code() returns text
language plpgsql set search_path = public as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; code text; i int;
begin
  loop
    code := '';
    for i in 1..5 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.events where join_code = code);
  end loop;
  return code;
end $$;

create or replace function public.server_time() returns timestamptz
language sql stable as $$ select clock_timestamp() $$;

-- ---------- SCORE REBUILD (internal) ----------
create or replace function public.recompute_scores(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.contestant_scores (contestant_id, event_id, total_points, correct_count, answered_count, correct_ms)
  select c.id, c.event_id,
         coalesce(sum(a.points), 0)::int
           + coalesce((select sum(s.delta) from public.score_adjustments s where s.contestant_id = c.id), 0)::int,
         count(*) filter (where a.is_correct)::int,
         count(a.id)::int,
         coalesce(sum(a.elapsed_ms) filter (where a.is_correct), 0)::bigint
  from public.contestants c
  left join public.answers a on a.contestant_id = c.id
  where c.event_id = p_event
  group by c.id, c.event_id
  on conflict (contestant_id) do update set
    total_points = excluded.total_points,
    correct_count = excluded.correct_count,
    answered_count = excluded.answered_count,
    correct_ms = excluded.correct_ms;

  insert into public.audience_scores (audience_id, event_id, display_name, total_points, correct_count, answered_count, correct_ms)
  select m.id, m.event_id, m.display_name,
         coalesce(sum(a.points), 0)::int,
         count(*) filter (where a.is_correct)::int,
         count(a.id)::int,
         coalesce(sum(a.elapsed_ms) filter (where a.is_correct), 0)::bigint
  from public.audience_members m
  left join public.answers a on a.audience_id = m.id
  where m.event_id = p_event
  group by m.id, m.event_id, m.display_name
  on conflict (audience_id) do update set
    display_name = excluded.display_name,
    total_points = excluded.total_points,
    correct_count = excluded.correct_count,
    answered_count = excluded.answered_count,
    correct_ms = excluded.correct_ms;
end $$;

-- ---------- PUBLIC / JOIN RPCs ----------
create or replace function public.get_event_by_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.events;
begin
  if auth.uid() is null then raise exception 'not_joined'; end if;
  select * into e from public.events where join_code = upper(btrim(p_code));
  if not found then raise exception 'no_event'; end if;
  return jsonb_build_object('id', e.id, 'name', e.name, 'status', e.status);
end $$;

create or replace function public.join_as_audience(
  p_code text,
  p_name text,
  p_assembly text,
  p_phone text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  e public.events;
  v_name text := btrim(coalesce(p_name, ''));
  v_assembly text := btrim(coalesce(p_assembly, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_id uuid;
  v_count int;
begin
  if auth.uid() is null then raise exception 'not_joined'; end if;
  select * into e from public.events where join_code = upper(btrim(p_code));
  if not found then raise exception 'no_event'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 30 then raise exception 'bad_name'; end if;
  if char_length(v_assembly) < 1 or char_length(v_assembly) > 60 then raise exception 'bad_assembly'; end if;
  if v_phone is not null then
    if char_length(v_phone) < 7 or char_length(v_phone) > 20 or v_phone !~ '^[0-9+ -]+$' then
      raise exception 'bad_phone';
    end if;
  end if;

  select id into v_id from public.audience_members where event_id = e.id and auth_user_id = auth.uid();
  if v_id is not null then
    update public.audience_members set display_name = v_name, assembly = v_assembly, phone = v_phone where id = v_id;
    update public.audience_scores set display_name = v_name where audience_id = v_id;
    return v_id;
  end if;

  select count(*) into v_count from public.audience_members where event_id = e.id;
  if v_count >= e.max_audience then raise exception 'audience_full'; end if;

  insert into public.audience_members (event_id, auth_user_id, display_name, assembly, phone)
  values (e.id, auth.uid(), v_name, v_assembly, v_phone) returning id into v_id;

  insert into public.audience_scores (audience_id, event_id, display_name)
  values (v_id, e.id, v_name)
  on conflict do nothing;

  return v_id;
end $$;

create or replace function public.join_as_contestant(p_code text, p_seat int, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare e public.events; c public.contestants; s public.contestant_secrets;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'not_joined'); end if;
  select * into e from public.events where join_code = upper(btrim(p_code));
  if not found then return jsonb_build_object('ok', false, 'code', 'no_event'); end if;
  select * into c from public.contestants where event_id = e.id and seat_no = p_seat;
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_pin'); end if;
  select * into s from public.contestant_secrets where contestant_id = c.id for update;
  if s.failed_pins >= 10 then return jsonb_build_object('ok', false, 'code', 'locked_out'); end if;
  if s.pin_hash is distinct from crypt(coalesce(p_pin, ''), s.pin_hash) then
    update public.contestant_secrets set failed_pins = failed_pins + 1 where contestant_id = c.id;
    return jsonb_build_object('ok', false, 'code', 'bad_pin');
  end if;
  update public.contestants set auth_user_id = null, claimed_at = null
    where event_id = e.id and auth_user_id = auth.uid() and id <> c.id;
  update public.contestants set auth_user_id = auth.uid(), claimed_at = now() where id = c.id;
  update public.contestant_secrets set failed_pins = 0 where contestant_id = c.id;
  return jsonb_build_object('ok', true, 'contestant_id', c.id, 'event_id', e.id);
end $$;

create or replace function public.submit_prediction(p_contestant uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_event uuid; v_aud uuid; v_status public.event_status;
begin
  select event_id into v_event from public.contestants where id = p_contestant;
  if v_event is null then raise exception 'no_event'; end if;
  v_aud := public.my_audience_id(v_event);
  if v_aud is null then raise exception 'not_joined'; end if;
  select status into v_status from public.events where id = v_event;
  if v_status <> 'predictions_open' then raise exception 'closed'; end if;
  insert into public.predictions (event_id, audience_id, contestant_id)
  values (v_event, v_aud, p_contestant)
  on conflict (audience_id) do update set contestant_id = excluded.contestant_id, updated_at = now();
end $$;

create or replace function public.submit_answer(p_question uuid, p_choice text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q public.questions; r public.rounds; gs public.game_state; ev public.events;
        v_c uuid; v_a uuid; v_elapsed int; v_rows int;
begin
  if auth.uid() is null then return jsonb_build_object('accepted', false, 'reason', 'not_joined'); end if;
  select * into q from public.questions where id = p_question;
  if not found then return jsonb_build_object('accepted', false, 'reason', 'closed'); end if;
  select * into ev from public.events where id = q.event_id;
  select * into r from public.rounds where id = q.round_id;
  select * into gs from public.game_state where event_id = q.event_id for share;
  if ev.status <> 'live' or gs.current_question_id is distinct from q.id or gs.question_status <> 'open' then
    return jsonb_build_object('accepted', false, 'reason', 'closed');
  end if;
  if clock_timestamp() > gs.closes_at + interval '700 milliseconds' then
    return jsonb_build_object('accepted', false, 'reason', 'late');
  end if;
  v_c := public.my_contestant_id(q.event_id);
  v_a := public.my_audience_id(q.event_id);
  if v_c is null and v_a is null then return jsonb_build_object('accepted', false, 'reason', 'not_joined'); end if;
  if q.answer_mode = 'spoken' then return jsonb_build_object('accepted', false, 'reason', 'spoken'); end if;
  if not exists (select 1 from jsonb_array_elements(q.options) o where o ->> 'key' = p_choice) then
    return jsonb_build_object('accepted', false, 'reason', 'bad_choice');
  end if;
  v_elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - gs.opened_at)) * 1000))::int;

  if v_c is not null then
    if q.assigned_contestant_id is not null and q.assigned_contestant_id <> v_c then
      return jsonb_build_object('accepted', false, 'reason', 'not_your_question');
    end if;
    insert into public.answers (event_id, question_id, contestant_id, choice_key, elapsed_ms)
    values (q.event_id, q.id, v_c, p_choice, v_elapsed)
    on conflict (question_id, contestant_id) do nothing;
  else
    if not r.audience_can_answer then return jsonb_build_object('accepted', false, 'reason', 'closed'); end if;
    insert into public.answers (event_id, question_id, audience_id, choice_key, elapsed_ms)
    values (q.event_id, q.id, v_a, p_choice, v_elapsed)
    on conflict (question_id, audience_id) do nothing;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('accepted', false, 'reason', 'already_answered'); end if;
  return jsonb_build_object('accepted', true, 'elapsed_ms', v_elapsed);
end $$;

-- ---------- HOST RPCs ----------
create or replace function public.host_create_event(p_name text) returns public.events
language plpgsql security definer set search_path = public as $$
declare e public.events; v_name text := btrim(coalesce(p_name, ''));
begin
  if not public.is_host() then raise exception 'not_owner'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'bad_name'; end if;
  insert into public.events (owner_id, name, join_code) values (auth.uid(), v_name, public.gen_join_code())
  returning * into e;
  insert into public.game_state (event_id) values (e.id);
  return e;
end $$;

create or replace function public.host_set_event_status(p_event uuid, p_status public.event_status) returns void
language plpgsql security definer set search_path = public as $$
declare e public.events; ok boolean;
begin
  perform public.assert_event_owner(p_event);
  select * into e from public.events where id = p_event for update;
  ok := (e.status = 'setup' and p_status in ('predictions_open','live'))
     or (e.status = 'predictions_open' and p_status = 'predictions_locked')
     or (e.status = 'predictions_locked' and p_status in ('predictions_open','live'))
     or (e.status = 'live' and p_status = 'finished')
     or (e.status = 'finished' and p_status = 'live');
  if not ok then raise exception 'bad_state'; end if;
  update public.events set status = p_status where id = p_event;
  update public.game_state set
    screen = case p_status
               when 'predictions_open' then 'predictions'::public.screen_mode
               when 'finished' then 'leaderboard'::public.screen_mode
               else screen end,
    version = version + 1, updated_at = now()
  where event_id = p_event;
end $$;

create or replace function public.host_create_contestant(p_event uuid, p_name text, p_group text, p_seat int, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_status public.event_status;
begin
  perform public.assert_event_owner(p_event);
  select status into v_status from public.events where id = p_event;
  if v_status = 'live' then raise exception 'bad_state'; end if;
  if p_seat is null or p_seat < 1 or p_seat > 8 then raise exception 'bad_seat'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'bad_pin'; end if;
  begin
    insert into public.contestants (event_id, seat_no, name, group_label)
    values (p_event, p_seat, btrim(p_name), nullif(btrim(coalesce(p_group, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'seat_taken';
  end;
  insert into public.contestant_secrets (contestant_id, pin_hash) values (v_id, crypt(p_pin, gen_salt('bf')));
  insert into public.contestant_scores (contestant_id, event_id) values (v_id, p_event);
  return v_id;
end $$;

create or replace function public.host_reset_contestant_pin(p_contestant uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_event uuid;
begin
  select event_id into v_event from public.contestants where id = p_contestant;
  if v_event is null then raise exception 'no_event'; end if;
  perform public.assert_event_owner(v_event);
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'bad_pin'; end if;
  update public.contestant_secrets set pin_hash = crypt(p_pin, gen_salt('bf')), failed_pins = 0 where contestant_id = p_contestant;
  update public.contestants set auth_user_id = null, claimed_at = null where id = p_contestant;
end $$;

create or replace function public.host_set_screen(p_event uuid, p_screen public.screen_mode) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_event_owner(p_event);
  update public.game_state set screen = p_screen, version = version + 1, updated_at = now() where event_id = p_event;
end $$;

create or replace function public.host_show_question(p_event uuid, p_question uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ev public.events; gs public.game_state; q public.questions; k public.question_keys;
begin
  perform public.assert_event_owner(p_event);
  select * into ev from public.events where id = p_event;
  select * into gs from public.game_state where event_id = p_event for update;
  if ev.status <> 'live' then raise exception 'bad_state'; end if;
  if gs.question_status not in ('hidden','shown','revealed') then raise exception 'bad_state'; end if;
  select * into q from public.questions where id = p_question and event_id = p_event;
  if not found then raise exception 'bad_state'; end if;
  if q.answer_mode = 'choice' then
    select * into k from public.question_keys where question_id = q.id;
    if not found or k.correct_key is null then raise exception 'no_key'; end if;
  end if;
  if gs.current_question_id is distinct from q.id and exists (select 1 from public.answers where question_id = q.id) then
    raise exception 'already_played';
  end if;
  update public.game_state set
    current_round_id = q.round_id, current_question_id = q.id, question_status = 'shown',
    screen = 'question', opened_at = null, closes_at = null, version = version + 1, updated_at = now()
  where event_id = p_event;
end $$;

create or replace function public.host_open_question(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare gs public.game_state; r public.rounds; v_now timestamptz := clock_timestamp();
begin
  perform public.assert_event_owner(p_event);
  select * into gs from public.game_state where event_id = p_event for update;
  if gs.question_status <> 'shown' then raise exception 'bad_state'; end if;
  select * into r from public.rounds where id = gs.current_round_id;
  update public.game_state set
    question_status = 'open', opened_at = v_now,
    closes_at = v_now + (r.time_limit_sec * interval '1 second'),
    version = version + 1, updated_at = now()
  where event_id = p_event;
end $$;

create or replace function public.host_lock_question(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare gs public.game_state;
begin
  perform public.assert_event_owner(p_event);
  select * into gs from public.game_state where event_id = p_event for update;
  if gs.question_status <> 'open' then raise exception 'bad_state'; end if;
  update public.game_state set question_status = 'locked', version = version + 1, updated_at = now() where event_id = p_event;
end $$;

create or replace function public.host_reveal_question(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare gs public.game_state; q public.questions; r public.rounds; k public.question_keys;
        v_total_ms numeric; v_first uuid;
begin
  perform public.assert_event_owner(p_event);
  select * into gs from public.game_state where event_id = p_event for update;
  if gs.question_status not in ('open','locked') then raise exception 'bad_state'; end if;
  select * into q from public.questions where id = gs.current_question_id;
  select * into r from public.rounds where id = q.round_id;
  select * into k from public.question_keys where question_id = q.id;
  if q.answer_mode = 'choice' then
    if not found or k.correct_key is null then raise exception 'no_key'; end if;
    v_total_ms := r.time_limit_sec * 1000;
    update public.answers a set is_correct = (a.choice_key = k.correct_key) where a.question_id = q.id;
    if r.type = 'speed' then
      update public.answers a set points = case
        when a.is_correct then round(
          r.max_points - (r.max_points - r.min_points)
          * least(1::numeric, greatest(0::numeric, coalesce(a.elapsed_ms, 0)::numeric / v_total_ms)))::int
        else -r.wrong_penalty end
      where a.question_id = q.id;
      if r.first_correct_bonus > 0 then
        select a.id into v_first from public.answers a
          where a.question_id = q.id and a.contestant_id is not null and a.is_correct
          order by a.elapsed_ms asc, a.submitted_at asc limit 1;
        if v_first is not null then
          update public.answers set points = points + r.first_correct_bonus where id = v_first;
        end if;
      end if;
    else
      update public.answers a set points = case
        when a.is_correct then coalesce(q.points_override, r.max_points)
        else -r.wrong_penalty end
      where a.question_id = q.id;
    end if;
  end if;
  update public.game_state set question_status = 'revealed', screen = 'answer', version = version + 1, updated_at = now()
  where event_id = p_event;
  perform public.recompute_scores(p_event);
end $$;

create or replace function public.host_reset_question(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare gs public.game_state;
begin
  perform public.assert_event_owner(p_event);
  select * into gs from public.game_state where event_id = p_event for update;
  if gs.current_question_id is null or gs.question_status = 'hidden' then raise exception 'bad_state'; end if;
  delete from public.answers where question_id = gs.current_question_id;
  update public.game_state set question_status = 'shown', screen = 'question', opened_at = null, closes_at = null,
    version = version + 1, updated_at = now() where event_id = p_event;
  perform public.recompute_scores(p_event);
end $$;

create or replace function public.host_mark_spoken(p_event uuid, p_contestant uuid, p_correct boolean) returns void
language plpgsql security definer set search_path = public as $$
declare gs public.game_state; q public.questions; r public.rounds;
begin
  perform public.assert_event_owner(p_event);
  select * into gs from public.game_state where event_id = p_event for update;
  if gs.current_question_id is null or gs.question_status not in ('open','locked','revealed') then raise exception 'bad_state'; end if;
  select * into q from public.questions where id = gs.current_question_id;
  if q.answer_mode <> 'spoken' then raise exception 'bad_state'; end if;
  if q.assigned_contestant_id is not null and q.assigned_contestant_id <> p_contestant then raise exception 'bad_state'; end if;
  if not exists (select 1 from public.contestants where id = p_contestant and event_id = p_event) then raise exception 'bad_state'; end if;
  select * into r from public.rounds where id = q.round_id;
  insert into public.answers (event_id, question_id, contestant_id, choice_key, elapsed_ms, is_correct, points)
  values (p_event, q.id, p_contestant, null, null, p_correct,
          case when p_correct then coalesce(q.points_override, r.max_points) else -r.wrong_penalty end)
  on conflict (question_id, contestant_id) do update set
    is_correct = excluded.is_correct, points = excluded.points, submitted_at = now();
  perform public.recompute_scores(p_event);
  update public.game_state set version = version + 1, updated_at = now() where event_id = p_event;
end $$;

create or replace function public.host_adjust_score(p_event uuid, p_contestant uuid, p_delta int, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_event_owner(p_event);
  if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'bad_reason'; end if;
  if not exists (select 1 from public.contestants where id = p_contestant and event_id = p_event) then raise exception 'bad_state'; end if;
  insert into public.score_adjustments (event_id, contestant_id, delta, reason) values (p_event, p_contestant, p_delta, btrim(p_reason));
  perform public.recompute_scores(p_event);
end $$;

create or replace function public.host_draw_raffle(p_event uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_winner uuid; v_pool int; v_pick uuid; v_name text; v_kind text;
begin
  perform public.assert_event_owner(p_event);
  select cs.contestant_id into v_winner
  from public.contestant_scores cs join public.contestants c on c.id = cs.contestant_id
  where cs.event_id = p_event
  order by cs.total_points desc, cs.correct_count desc, cs.correct_ms asc, c.seat_no asc limit 1;

  select count(*) into v_pool from public.predictions p
  where p.event_id = p_event and p.contestant_id = v_winner
    and not exists (select 1 from public.raffle_draws d where d.audience_id = p.audience_id);
  if v_pool > 0 then
    v_kind := 'correct_predictors';
    select p.audience_id into v_pick from public.predictions p
    where p.event_id = p_event and p.contestant_id = v_winner
      and not exists (select 1 from public.raffle_draws d where d.audience_id = p.audience_id)
    order by random() limit 1;
  else
    v_kind := 'all_audience';
    select count(*) into v_pool from public.audience_members m
    where m.event_id = p_event and not exists (select 1 from public.raffle_draws d where d.audience_id = m.id);
    if v_pool = 0 then raise exception 'no_audience'; end if;
    select m.id into v_pick from public.audience_members m
    where m.event_id = p_event and not exists (select 1 from public.raffle_draws d where d.audience_id = m.id)
    order by random() limit 1;
  end if;
  select display_name into v_name from public.audience_members where id = v_pick;
  insert into public.raffle_draws (event_id, audience_id, winner_name, pool_kind, pool_size)
  values (p_event, v_pick, v_name, v_kind, v_pool);
  update public.game_state set screen = 'raffle', version = version + 1, updated_at = now() where event_id = p_event;
  return jsonb_build_object('winner_name', v_name, 'pool_kind', v_kind, 'pool_size', v_pool);
end $$;

create or replace function public.host_show_round_summary(p_event uuid, p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_event_owner(p_event);
  if not exists (select 1 from public.rounds where id = p_round and event_id = p_event) then
    raise exception 'bad_state';
  end if;
  update public.game_state set
    screen = 'round_summary',
    summary_round_id = p_round,
    version = version + 1,
    updated_at = now()
  where event_id = p_event;
end $$;

create or replace function public.get_round_summary(p_event uuid, p_round uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_round public.rounds;
  v_gs public.game_state;
  v_contestants jsonb;
  v_audience_top5 jsonb;
  v_my_audience jsonb := null;
  v_my_aud_id uuid;
begin
  select * into v_round from public.rounds where id = p_round and event_id = p_event;
  if not found then raise exception 'bad_state'; end if;

  select * into v_gs from public.game_state where event_id = p_event;
  if not found then raise exception 'no_event'; end if;

  if not (public.is_event_owner(p_event) or (
    public.is_event_member(p_event) and v_gs.screen = 'round_summary' and v_gs.summary_round_id = p_round
  )) then
    raise exception 'closed';
  end if;

  -- 1. Contestants ranked by total points using doc 04 §6
  with contestant_round_points as (
    select
      c.id as contestant_id,
      c.name,
      c.group_label,
      c.seat_no,
      coalesce(cs.total_points, 0) as total_points,
      coalesce(cs.correct_count, 0) as total_correct_count,
      coalesce(cs.correct_ms, 0) as total_correct_ms,
      coalesce(sum(a.points) filter (where q.round_id = p_round), 0)::int as round_points,
      count(a.id) filter (where q.round_id = p_round and a.is_correct)::int as correct_in_round
    from public.contestants c
    left join public.contestant_scores cs on cs.contestant_id = c.id
    left join public.answers a on a.contestant_id = c.id
    left join public.questions q on q.id = a.question_id
    where c.event_id = p_event
    group by c.id, c.name, c.group_label, c.seat_no, cs.total_points, cs.correct_count, cs.correct_ms
  ),
  ranked_contestants as (
    select
      contestant_id,
      name,
      group_label,
      round_points,
      total_points,
      correct_in_round,
      rank() over (order by total_points desc, total_correct_count desc, total_correct_ms asc) as rank,
      seat_no
    from contestant_round_points
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'contestant_id', contestant_id,
      'name', name,
      'group_label', group_label,
      'round_points', round_points,
      'total_points', total_points,
      'correct_in_round', correct_in_round,
      'rank', rank
    ) order by rank asc, seat_no asc
  ), '[]'::jsonb)
  into v_contestants
  from ranked_contestants;

  -- 2. Audience top 5 (empty if round does not allow audience)
  if v_round.audience_can_answer then
    with audience_ranked as (
      select
        m.id as audience_id,
        m.display_name as name,
        m.assembly,
        coalesce(s.total_points, 0) as total_points,
        coalesce(s.correct_count, 0) as correct_count,
        coalesce(s.correct_ms, 0) as correct_ms,
        m.joined_at,
        coalesce(sum(a.points) filter (where q.round_id = p_round), 0)::int as round_points,
        rank() over (order by coalesce(s.total_points, 0) desc, coalesce(s.correct_count, 0) desc, coalesce(s.correct_ms, 0) asc, m.joined_at asc) as rank
      from public.audience_members m
      left join public.audience_scores s on s.audience_id = m.id
      left join public.answers a on a.audience_id = m.id
      left join public.questions q on q.id = a.question_id
      where m.event_id = p_event
      group by m.id, m.display_name, m.assembly, s.total_points, s.correct_count, s.correct_ms, m.joined_at
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'name', name,
        'assembly', assembly,
        'round_points', round_points,
        'total_points', total_points,
        'rank', rank
      ) order by rank asc
    ), '[]'::jsonb)
    into v_audience_top5
    from (
      select * from audience_ranked order by rank asc limit 5
    ) top5;
  else
    v_audience_top5 := '[]'::jsonb;
  end if;

  -- 3. my_audience (only when caller is an audience member)
  v_my_aud_id := public.my_audience_id(p_event);
  if v_my_aud_id is not null then
    with audience_ranked as (
      select
        m.id as audience_id,
        coalesce(s.total_points, 0) as total_points,
        coalesce(sum(a.points) filter (where q.round_id = p_round), 0)::int as round_points,
        rank() over (order by coalesce(s.total_points, 0) desc, coalesce(s.correct_count, 0) desc, coalesce(s.correct_ms, 0) asc, m.joined_at asc) as rank
      from public.audience_members m
      left join public.audience_scores s on s.audience_id = m.id
      left join public.answers a on a.audience_id = m.id
      left join public.questions q on q.id = a.question_id
      where m.event_id = p_event
      group by m.id, s.total_points, s.correct_count, s.correct_ms, m.joined_at
    )
    select jsonb_build_object(
      'rank', rank,
      'total_points', total_points,
      'round_points', round_points
    )
    into v_my_audience
    from audience_ranked
    where audience_id = v_my_aud_id;
  end if;

  return jsonb_build_object(
    'round_title', v_round.title,
    'contestants', v_contestants,
    'audience_top5', v_audience_top5,
    'my_audience', v_my_audience
  );
end $$;

create or replace function public.get_audience_board(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_gs public.game_state;
  v_audience_top5 jsonb;
  v_my_audience jsonb := null;
  v_my_aud_id uuid;
begin
  select * into v_gs from public.game_state where event_id = p_event;
  if not found then raise exception 'no_event'; end if;

  if not (public.is_event_owner(p_event) or (
    public.is_event_member(p_event) and v_gs.screen = 'audience_board'
  )) then
    raise exception 'closed';
  end if;

  with audience_ranked as (
    select
      m.id as audience_id,
      m.display_name as name,
      m.assembly,
      coalesce(s.total_points, 0) as total_points,
      rank() over (order by coalesce(s.total_points, 0) desc, coalesce(s.correct_count, 0) desc, coalesce(s.correct_ms, 0) asc, m.joined_at asc) as rank
    from public.audience_members m
    left join public.audience_scores s on s.audience_id = m.id
    where m.event_id = p_event
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', name,
      'assembly', assembly,
      'total_points', total_points,
      'rank', rank
    ) order by rank asc
  ), '[]'::jsonb)
  into v_audience_top5
  from (
    select * from audience_ranked order by rank asc limit 5
  ) top5;

  v_my_aud_id := public.my_audience_id(p_event);
  if v_my_aud_id is not null then
    with audience_ranked as (
      select
        m.id as audience_id,
        coalesce(s.total_points, 0) as total_points,
        rank() over (order by coalesce(s.total_points, 0) desc, coalesce(s.correct_count, 0) desc, coalesce(s.correct_ms, 0) asc, m.joined_at asc) as rank
      from public.audience_members m
      left join public.audience_scores s on s.audience_id = m.id
      where m.event_id = p_event
    )
    select jsonb_build_object(
      'rank', rank,
      'total_points', total_points
    )
    into v_my_audience
    from audience_ranked
    where audience_id = v_my_aud_id;
  end if;

  return jsonb_build_object(
    'audience_top5', v_audience_top5,
    'my_audience', v_my_audience
  );
end $$;

create or replace function public.host_import_questions(
  p_event uuid,
  p_round uuid,
  p_questions jsonb
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_len int;
  v_max_pos int;
  v_i int;
  v_item jsonb;
  v_body text;
  v_mode text;
  v_options jsonb;
  v_opt_len int;
  v_opt_idx int;
  v_opt_key text;
  v_opt_text text;
  v_expected_key text;
  v_correct_key text;
  v_assigned uuid;
  v_scripture text;
  v_explanation text;
  v_points_override int;
  v_q_id uuid;
begin
  perform public.assert_event_owner(p_event);
  if not exists (select 1 from public.rounds where id = p_round and event_id = p_event) then
    raise exception 'bad_state';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'bad_question: not an array';
  end if;

  v_len := jsonb_array_length(p_questions);
  if v_len < 1 or v_len > 500 then
    raise exception 'bad_question: count must be between 1 and 500';
  end if;

  -- Validate all items first
  for v_i in 1..v_len loop
    v_item := p_questions -> (v_i - 1);
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'bad_question: item % is not an object', v_i;
    end if;

    v_body := btrim(coalesce(v_item ->> 'body', ''));
    if char_length(v_body) < 3 or char_length(v_body) > 400 then
      raise exception 'bad_question: item % has invalid body length', v_i;
    end if;

    v_mode := coalesce(v_item ->> 'answer_mode', 'choice');
    if v_mode not in ('choice', 'spoken') then
      raise exception 'bad_question: item % has invalid answer_mode', v_i;
    end if;

    v_options := v_item -> 'options';
    if v_options is null or jsonb_typeof(v_options) <> 'array' then
      raise exception 'bad_question: item % options must be an array', v_i;
    end if;

    v_opt_len := jsonb_array_length(v_options);
    if v_opt_len < 2 or v_opt_len > 5 then
      raise exception 'bad_question: item % must have 2 to 5 options', v_i;
    end if;

    for v_opt_idx in 0..(v_opt_len - 1) loop
      v_expected_key := chr(65 + v_opt_idx); -- 'A', 'B', 'C', 'D', 'E'
      v_opt_key := v_options -> v_opt_idx ->> 'key';
      v_opt_text := btrim(coalesce(v_options -> v_opt_idx ->> 'text', ''));

      if v_opt_key is distinct from v_expected_key then
        raise exception 'bad_question: item % option % key must be %', v_i, v_opt_idx + 1, v_expected_key;
      end if;
      if char_length(v_opt_text) < 1 then
        raise exception 'bad_question: item % option % text is empty', v_i, v_expected_key;
      end if;
    end loop;

    v_correct_key := v_item ->> 'correct_key';
    if v_mode = 'choice' then
      if v_correct_key is null or not exists (
        select 1 from jsonb_array_elements(v_options) opt where opt ->> 'key' = v_correct_key
      ) then
        raise exception 'bad_question: item % correct_key % is missing or invalid', v_i, coalesce(v_correct_key, 'null');
      end if;
    end if;

    if v_item ->> 'assigned_contestant_id' is not null and (v_item ->> 'assigned_contestant_id') <> '' then
      v_assigned := (v_item ->> 'assigned_contestant_id')::uuid;
      if not exists (select 1 from public.contestants where id = v_assigned and event_id = p_event) then
        raise exception 'bad_question: item % assigned contestant not found', v_i;
      end if;
    end if;
  end loop;

  -- All items are valid, insert them
  select coalesce(max(position), 0) into v_max_pos from public.questions where round_id = p_round;

  for v_i in 1..v_len loop
    v_item := p_questions -> (v_i - 1);
    v_body := btrim(v_item ->> 'body');
    v_mode := coalesce(v_item ->> 'answer_mode', 'choice');
    v_options := v_item -> 'options';
    v_correct_key := v_item ->> 'correct_key';
    v_scripture := nullif(btrim(coalesce(v_item ->> 'scripture_ref', '')), '');
    v_explanation := nullif(btrim(coalesce(v_item ->> 'explanation', '')), '');
    v_assigned := null;
    if v_item ->> 'assigned_contestant_id' is not null and (v_item ->> 'assigned_contestant_id') <> '' then
      v_assigned := (v_item ->> 'assigned_contestant_id')::uuid;
    end if;
    v_points_override := null;
    if v_item ->> 'points_override' is not null and (v_item ->> 'points_override') <> '' then
      v_points_override := (v_item ->> 'points_override')::int;
    end if;

    insert into public.questions (
      event_id, round_id, position, body, options, scripture_ref, answer_mode, assigned_contestant_id, points_override
    ) values (
      p_event, p_round, v_max_pos + v_i, v_body, v_options, v_scripture, v_mode, v_assigned, v_points_override
    ) returning id into v_q_id;

    insert into public.question_keys (question_id, event_id, correct_key, explanation)
    values (v_q_id, p_event, v_correct_key, v_explanation);
  end loop;

  return v_len;
end $$;

create or replace function public.host_move_question(
  p_event uuid,
  p_question uuid,
  p_round uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_q public.questions;
  v_old_round uuid;
  v_gs public.game_state;
  v_max_pos int;
begin
  perform public.assert_event_owner(p_event);

  select * into v_q from public.questions where id = p_question and event_id = p_event;
  if not found then raise exception 'bad_state'; end if;

  if not exists (select 1 from public.rounds where id = p_round and event_id = p_event) then
    raise exception 'bad_state';
  end if;

  select * into v_gs from public.game_state where event_id = p_event;
  if v_gs.current_question_id = p_question then
    raise exception 'already_played';
  end if;

  if exists (select 1 from public.answers where question_id = p_question) then
    raise exception 'already_played';
  end if;

  v_old_round := v_q.round_id;
  if v_old_round = p_round then
    return;
  end if;

  -- Target round max position
  select coalesce(max(position), 0) into v_max_pos from public.questions where round_id = p_round;

  -- Move question to target round
  update public.questions
  set round_id = p_round, position = v_max_pos + 1
  where id = p_question;

  -- Renumber old round to close gap cleanly
  update public.questions set position = position + 10000 where round_id = v_old_round;

  with renumbered as (
    select id, row_number() over (order by position asc) as new_pos
    from public.questions
    where round_id = v_old_round
  )
  update public.questions q
  set position = r.new_pos
  from renumbered r
  where q.id = r.id;
end $$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.events enable row level security;
alter table public.contestants enable row level security;
alter table public.contestant_secrets enable row level security;
alter table public.audience_members enable row level security;
alter table public.rounds enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.game_state enable row level security;
alter table public.answers enable row level security;
alter table public.predictions enable row level security;
alter table public.contestant_scores enable row level security;
alter table public.audience_scores enable row level security;
alter table public.score_adjustments enable row level security;
alter table public.raffle_draws enable row level security;

-- events
create policy events_read on public.events for select to authenticated
  using (public.is_event_owner(id) or public.is_event_member(id));
create policy events_update on public.events for update to authenticated
  using (public.is_event_owner(id)) with check (public.is_event_owner(id));
create policy events_delete on public.events for delete to authenticated
  using (public.is_event_owner(id));

-- contestants (no secrets here)
create policy contestants_read on public.contestants for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));
create policy contestants_update on public.contestants for update to authenticated
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));
create policy contestants_delete on public.contestants for delete to authenticated
  using (public.is_event_owner(event_id));
-- contestant_secrets: RLS on, NO policies, NO grants => unreachable by clients

-- audience
create policy audience_read on public.audience_members for select to authenticated
  using (public.is_event_owner(event_id) or auth_user_id = auth.uid());
create policy audience_delete on public.audience_members for delete to authenticated
  using (public.is_event_owner(event_id));

-- rounds
create policy rounds_read on public.rounds for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));
create policy rounds_write on public.rounds for all to authenticated
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));

-- questions: owner everything; members only the CURRENT question once shown
create policy questions_owner on public.questions for all to authenticated
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));
create policy questions_member_read on public.questions for select to authenticated
  using (
    public.is_event_member(event_id)
    and exists (select 1 from public.game_state g
                where g.event_id = questions.event_id
                  and g.current_question_id = questions.id
                  and g.question_status <> 'hidden')
  );

-- keys: owner everything; members only when current question is revealed
create policy keys_owner on public.question_keys for all to authenticated
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));
create policy keys_member_read on public.question_keys for select to authenticated
  using (
    public.is_event_member(event_id)
    and exists (select 1 from public.game_state g
                where g.event_id = question_keys.event_id
                  and g.current_question_id = question_keys.question_id
                  and g.question_status = 'revealed')
  );

-- game_state (read only for clients)
create policy game_state_read on public.game_state for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));

-- answers (read only for clients)
create policy answers_owner_read on public.answers for select to authenticated
  using (public.is_event_owner(event_id));
create policy answers_self_read on public.answers for select to authenticated
  using (contestant_id = public.my_contestant_id(event_id) or audience_id = public.my_audience_id(event_id));
create policy answers_revealed_read on public.answers for select to authenticated
  using (
    contestant_id is not null
    and public.is_event_member(event_id)
    and exists (select 1 from public.game_state g
                where g.event_id = answers.event_id
                  and g.current_question_id = answers.question_id
                  and g.question_status = 'revealed')
  );

-- predictions
create policy predictions_read on public.predictions for select to authenticated
  using (public.is_event_owner(event_id) or audience_id = public.my_audience_id(event_id));

-- scores / adjustments / raffle
create policy cscores_read on public.contestant_scores for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));
create policy ascores_read on public.audience_scores for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));
create policy adjustments_read on public.score_adjustments for select to authenticated
  using (public.is_event_owner(event_id));
create policy raffle_read on public.raffle_draws for select to authenticated
  using (public.is_event_owner(event_id) or public.is_event_member(event_id));

-- ---------- GRANTS ----------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.events, public.contestants, public.audience_members, public.rounds, public.questions,
  public.question_keys, public.game_state, public.answers, public.predictions, public.contestant_scores,
  public.audience_scores, public.score_adjustments, public.raffle_draws to authenticated;
grant update (name, max_audience) on public.events to authenticated;
grant delete on public.events to authenticated;
grant update (name, group_label, photo_url, seat_no) on public.contestants to authenticated;
grant delete on public.contestants to authenticated;
grant delete on public.audience_members to authenticated;
grant insert, update, delete on public.rounds, public.questions, public.question_keys to authenticated;

grant execute on function
  public.server_time(), public.get_event_by_code(text), public.join_as_audience(text, text, text, text),
  public.join_as_contestant(text, int, text), public.submit_prediction(uuid), public.submit_answer(uuid, text),
  public.host_create_event(text), public.host_set_event_status(uuid, public.event_status),
  public.host_create_contestant(uuid, text, text, int, text), public.host_reset_contestant_pin(uuid, text),
  public.host_set_screen(uuid, public.screen_mode), public.host_show_question(uuid, uuid),
  public.host_open_question(uuid), public.host_lock_question(uuid), public.host_reveal_question(uuid),
  public.host_reset_question(uuid), public.host_mark_spoken(uuid, uuid, boolean),
  public.host_adjust_score(uuid, uuid, int, text), public.host_draw_raffle(uuid),
  public.host_show_round_summary(uuid, uuid), public.get_round_summary(uuid, uuid),
  public.get_audience_board(uuid), public.host_import_questions(uuid, uuid, jsonb),
  public.host_move_question(uuid, uuid, uuid),
  public.is_host(), public.is_event_owner(uuid), public.is_event_member(uuid),
  public.my_contestant_id(uuid), public.my_audience_id(uuid)
to authenticated;
-- NOT granted to clients: recompute_scores, assert_event_owner, gen_join_code (internal only)

-- ---------- REALTIME ----------
alter table public.answers replica identity full;
alter table public.audience_members replica identity full;
alter table public.predictions replica identity full;
alter table public.contestants replica identity full;
alter table public.contestant_scores replica identity full;
alter table public.audience_scores replica identity full;

alter publication supabase_realtime add table
  public.game_state, public.answers, public.audience_members, public.contestants,
  public.predictions, public.contestant_scores, public.audience_scores, public.raffle_draws;

-- ---------- STORAGE (images) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy media_read on storage.objects for select using (bucket_id = 'media');
create policy media_host_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_host());
create policy media_host_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_host());
create policy media_host_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_host());
