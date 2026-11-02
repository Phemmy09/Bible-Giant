-- =====================================================================
-- BIBLE GIANTS — Migration 002: Phase A
-- Operator Dashboard, Question Import, and Live Sync Additions
-- Safe to run ONCE on an existing Supabase project.
-- =====================================================================

-- 1. Audience table additions
alter table public.audience_members add column if not exists assembly text not null default 'Unknown';
alter table public.audience_members alter column assembly drop default;
alter table public.audience_members add column if not exists phone text;

alter table public.audience_members drop constraint if exists audience_members_phone_check;
alter table public.audience_members add constraint audience_members_phone_check
  check (phone is null or (char_length(btrim(phone)) between 7 and 20 and btrim(phone) ~ '^[0-9+ -]+$'));

alter table public.audience_members drop constraint if exists audience_members_assembly_check;
alter table public.audience_members add constraint audience_members_assembly_check
  check (char_length(btrim(assembly)) between 1 and 60);

-- 2. Screen mode enum additions
alter type public.screen_mode add value if not exists 'round_summary';
alter type public.screen_mode add value if not exists 'audience_board';

-- 3. Game state column addition
alter table public.game_state add column if not exists summary_round_id uuid references public.rounds(id) on delete set null;

-- 4. Replace join_as_audience
drop function if exists public.join_as_audience(text, text);

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

-- 5. host_show_round_summary
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

-- 6. get_round_summary
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

-- 7. get_audience_board
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

-- 8. host_import_questions
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

-- 9. host_move_question
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

-- 10. Grants
grant execute on function
  public.host_show_round_summary(uuid, uuid),
  public.get_round_summary(uuid, uuid),
  public.get_audience_board(uuid),
  public.host_import_questions(uuid, uuid, jsonb),
  public.host_move_question(uuid, uuid, uuid),
  public.join_as_audience(text, text, text, text)
to authenticated;
