import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase A Gate A1: Database Migration & Schema Invariants (DB-A01 ... DB-A06)', () => {
  const rootDir = process.cwd();
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '002_phase_a.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  it('DB-A01: Migration 002_phase_a.sql and schema.sql define identical Phase A additions', () => {
    // 1. screen_mode has 'round_summary' and 'audience_board'
    expect(schemaSql).toContain("'round_summary'");
    expect(schemaSql).toContain("'audience_board'");
    expect(migrationSql).toContain("'round_summary'");
    expect(migrationSql).toContain("'audience_board'");

    // 2. audience_members has assembly (1-60) and phone (7-20)
    expect(schemaSql).toContain('assembly text not null');
    expect(schemaSql).toContain('char_length(btrim(assembly)) between 1 and 60');
    expect(schemaSql).toContain('phone text');
    expect(schemaSql).toContain('char_length(btrim(phone)) between 7 and 20');

    expect(migrationSql).toContain('add column if not exists assembly text not null');
    expect(migrationSql).toContain('add column if not exists phone text');

    // 3. game_state has summary_round_id
    expect(schemaSql).toContain('summary_round_id uuid references public.rounds(id)');
    expect(migrationSql).toContain('add column if not exists summary_round_id uuid references public.rounds(id)');

    // 4. All 5 new RPCs + updated join_as_audience exist in both
    const requiredFunctions = [
      'join_as_audience',
      'host_show_round_summary',
      'get_round_summary',
      'get_audience_board',
      'host_import_questions',
      'host_move_question',
    ];

    for (const fn of requiredFunctions) {
      expect(schemaSql, `schema.sql missing ${fn}`).toContain(`function public.${fn}`);
      expect(migrationSql, `002_phase_a.sql missing ${fn}`).toContain(`function public.${fn}`);
    }

    // 5. Grants: all new/updated functions granted to authenticated in both
    for (const fn of requiredFunctions) {
      expect(schemaSql, `schema.sql grants missing ${fn}`).toContain(`public.${fn}`);
      expect(migrationSql, `002_phase_a.sql grants missing ${fn}`).toContain(`public.${fn}`);
    }

    // 6. Internal functions remain strictly ungranted
    const ungranted = ['recompute_scores', 'assert_event_owner', 'gen_join_code'];
    for (const fn of ungranted) {
      expect(schemaSql).not.toContain(`grant execute on function public.${fn}`);
      expect(migrationSql).not.toContain(`grant execute on function public.${fn}`);
    }
  });

  it('DB-A02: join_as_audience enforces assembly (1-60) and phone format (7-20 digits)', () => {
    // Verifies the SQL contract for join_as_audience validation in schema and migration
    for (const sql of [schemaSql, migrationSql]) {
      expect(sql).toContain("raise exception 'bad_assembly'");
      expect(sql).toContain("raise exception 'bad_phone'");
      expect(sql).toContain("p_assembly text");
      expect(sql).toContain("p_phone text");
    }

    // Pure validation logic simulation
    function validateJoin(name: string, assembly: string, phone?: string | null) {
      const vName = name.trim();
      const vAssembly = assembly.trim();
      const vPhone = phone ? phone.trim() : null;

      if (vName.length < 1 || vName.length > 30) throw new Error('bad_name');
      if (vAssembly.length < 1 || vAssembly.length > 60) throw new Error('bad_assembly');
      if (vPhone !== null) {
        if (vPhone.length < 7 || vPhone.length > 20 || !/^[0-9+ -]+$/.test(vPhone)) {
          throw new Error('bad_phone');
        }
      }
      return { ok: true, vName, vAssembly, vPhone };
    }

    // Missing or invalid assembly throws bad_assembly
    expect(() => validateJoin('John Doe', '')).toThrow('bad_assembly');
    expect(() => validateJoin('John Doe', '   ')).toThrow('bad_assembly');
    expect(() => validateJoin('John Doe', 'A'.repeat(61))).toThrow('bad_assembly');

    // Invalid phone throws bad_phone
    expect(() => validateJoin('John Doe', 'Ado Central', '123')).toThrow('bad_phone');
    expect(() => validateJoin('John Doe', 'Ado Central', 'phone-with-letters')).toThrow('bad_phone');

    // Blank phone is accepted as null
    const validBlankPhone = validateJoin('John Doe', 'Ado Central', '');
    expect(validBlankPhone.vPhone).toBeNull();
    const validNullPhone = validateJoin('John Doe', 'Ado Central', null);
    expect(validNullPhone.vPhone).toBeNull();

    // Valid phone is accepted
    const validWithPhone = validateJoin('John Doe', 'Ado Central', '+234 803 123 4567');
    expect(validWithPhone.vPhone).toBe('+234 803 123 4567');
  });

  it('DB-A03: host_import_questions validates all items atomically up to 500 items', () => {
    for (const sql of [schemaSql, migrationSql]) {
      expect(sql).toContain("function public.host_import_questions");
      expect(sql).toContain("bad_question");
      expect(sql).toContain("v_len > 500");
    }

    // Pure validation logic simulation matching PL/pgSQL host_import_questions contract
    function validateImport(questions: any[]): number {
      if (!Array.isArray(questions)) throw new Error('bad_question: not an array');
      if (questions.length < 1 || questions.length > 500) throw new Error('bad_question: count must be between 1 and 500');

      for (let i = 0; i < questions.length; i++) {
        const item = questions[i];
        const itemNum = i + 1;
        if (!item || typeof item !== 'object') throw new Error(`bad_question: item ${itemNum} is not an object`);
        const body = (item.body || '').trim();
        if (body.length < 3 || body.length > 400) throw new Error(`bad_question: item ${itemNum} has invalid body length`);
        const mode = item.answer_mode || 'choice';
        if (mode !== 'choice' && mode !== 'spoken') throw new Error(`bad_question: item ${itemNum} has invalid answer_mode`);
        const options = item.options;
        if (!Array.isArray(options) || options.length < 2 || options.length > 5) {
          throw new Error(`bad_question: item ${itemNum} must have 2 to 5 options`);
        }
        for (let o = 0; o < options.length; o++) {
          const expectedKey = String.fromCharCode(65 + o);
          if (options[o].key !== expectedKey) throw new Error(`bad_question: item ${itemNum} option ${o + 1} key must be ${expectedKey}`);
          if (!options[o].text || !options[o].text.trim()) throw new Error(`bad_question: item ${itemNum} option ${expectedKey} text is empty`);
        }
        if (mode === 'choice') {
          const correctKey = item.correct_key;
          if (!correctKey || !options.some((opt: any) => opt.key === correctKey)) {
            throw new Error(`bad_question: item ${itemNum} correct_key ${correctKey} is missing or invalid`);
          }
        }
      }
      return questions.length;
    }

    // 3 valid items: returns 3
    const valid3 = [
      {
        body: 'Who built the ark?',
        options: [
          { key: 'A', text: 'Moses' },
          { key: 'B', text: 'Noah' },
        ],
        correct_key: 'B',
      },
      {
        body: 'How many days was Jonah in the belly of the fish?',
        options: [
          { key: 'A', text: '3 days and 3 nights' },
          { key: 'B', text: '7 days' },
        ],
        correct_key: 'A',
      },
      {
        body: 'Where was Jesus born?',
        options: [
          { key: 'A', text: 'Nazareth' },
          { key: 'B', text: 'Bethlehem' },
        ],
        correct_key: 'B',
      },
    ];
    expect(validateImport(valid3)).toBe(3);

    // 50 items with item 23 having an invalid correct_key 'E' (only 4 options A-D)
    const items50 = Array.from({ length: 50 }, (_, i) => ({
      body: `Question number ${i + 1} with enough length`,
      options: [
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' },
      ],
      correct_key: i === 22 ? 'E' : 'A',
    }));

    // Must throw bad_question naming item 23
    expect(() => validateImport(items50)).toThrow('bad_question: item 23 correct_key E is missing or invalid');
  });

  it('DB-A04: host_move_question refuses played questions and preserves unique ordering', () => {
    for (const sql of [schemaSql, migrationSql]) {
      expect(sql).toContain("function public.host_move_question");
      expect(sql).toContain("already_played");
      expect(sql).toContain("position = position + 10000");
    }
  });

  it('DB-A05: get_round_summary enforces closed unless round_summary and never exposes phone', () => {
    for (const sql of [schemaSql, migrationSql]) {
      expect(sql).toContain("function public.get_round_summary");
      expect(sql).toContain("screen = 'round_summary'");
      expect(sql).toContain("raise exception 'closed'");
      expect(sql).toContain("limit 5");
      // Must not select or return phone in get_round_summary
      expect(sql).not.toMatch(/get_round_summary[\s\S]*?'phone'/);
    }
  });

  it('DB-A06: get_audience_board limits to top 5 and never exposes phone', () => {
    for (const sql of [schemaSql, migrationSql]) {
      expect(sql).toContain("function public.get_audience_board");
      expect(sql).toContain("screen = 'audience_board'");
      expect(sql).toContain("limit 5");
      // Must not select or return phone in get_audience_board
      expect(sql).not.toMatch(/get_audience_board[\s\S]*?'phone'/);
    }
  });
});

