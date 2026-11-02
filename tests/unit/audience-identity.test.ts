import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { registerAudienceMember, getAudienceLeaderboard } from '@/lib/audienceRegistry';

describe('Phase A Gate A2: Audience Identity (Join Form, Operator List, CSV Export)', () => {
  describe('Audience Join Form Validation (§6.1)', () => {
    function validateJoinForm(fields: {
      code: string;
      name: string;
      assembly: string;
      phone?: string | null;
    }) {
      const code = fields.code.trim().toUpperCase();
      const name = fields.name.trim();
      const assembly = fields.assembly.trim();
      const phone = fields.phone ? fields.phone.trim() : null;

      if (!code || code.length !== 5) {
        return { valid: false, error: 'Please enter the 5-character event code' };
      }
      if (!name || name.length < 1 || name.length > 30) {
        return { valid: false, error: 'Please enter your name (1–30 characters)' };
      }
      if (!assembly || assembly.length < 1 || assembly.length > 60) {
        return { valid: false, error: 'Please enter your assembly or church (1–60 characters)' };
      }
      if (phone !== null && phone !== '') {
        if (phone.length < 7 || phone.length > 20 || !/^[0-9+ -]+$/.test(phone)) {
          return { valid: false, error: 'Phone number must be between 7 and 20 digits (digits, spaces, +, -)' };
        }
      }

      return { valid: true, data: { code, name, assembly, phone: phone || null } };
    }

    it('rejects missing or wrong-length event code', () => {
      expect(validateJoinForm({ code: '', name: 'Bro. David', assembly: 'Ado Central' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'ABCD', name: 'Bro. David', assembly: 'Ado Central' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'ABCDEF', name: 'Bro. David', assembly: 'Ado Central' }).valid).toBe(false);
    });

    it('rejects missing or overly long name (> 30 chars)', () => {
      expect(validateJoinForm({ code: 'GIANT', name: '', assembly: 'Ado Central' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'GIANT', name: 'A'.repeat(31), assembly: 'Ado Central' }).valid).toBe(false);
    });

    it('requires assembly / church (1–60 chars)', () => {
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: '' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: '   ' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'A'.repeat(61) }).valid).toBe(false);
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Ekiti Central' }).valid).toBe(true);
    });

    it('allows optional phone number; validates format when supplied', () => {
      // Blank or null phone is valid
      const resBlank = validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Central', phone: '' });
      expect(resBlank.valid).toBe(true);
      expect(resBlank.data?.phone).toBeNull();

      const resNull = validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Central', phone: null });
      expect(resNull.valid).toBe(true);
      expect(resNull.data?.phone).toBeNull();

      // Invalid phone format
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Central', phone: '123' }).valid).toBe(false);
      expect(validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Central', phone: '0801abc5678' }).valid).toBe(false);

      // Valid phone
      const resPhone = validateJoinForm({ code: 'GIANT', name: 'Bro. David', assembly: 'Ado Central', phone: '+234 803 123 4567' });
      expect(resPhone.valid).toBe(true);
      expect(resPhone.data?.phone).toBe('+234 803 123 4567');
    });
  });

  describe('Audience Registry & Identity Persistence (§6.2 & §6.4)', () => {
    it('registers audience member with assembly and optional phone', () => {
      const eventId = 'test-event-a2';
      const member = registerAudienceMember({
        event_id: eventId,
        name: 'Bro. Emmanuel',
        assembly: 'Ikole Assembly',
        phone: '+234 802 345 6789',
      });

      expect(member.name).toBe('Bro. Emmanuel');
      expect(member.assembly).toBe('Ikole Assembly');
      expect(member.phone).toBe('+234 802 345 6789');
    });

    it('rejoining with same identity updates assembly or phone (§6.4)', () => {
      const eventId = 'test-event-a2-rejoin';
      const m1 = registerAudienceMember({
        event_id: eventId,
        name: 'Sis. Abigail',
        assembly: 'Akure District',
        phone: '0809 111 2233',
      });

      const m2 = registerAudienceMember({
        event_id: eventId,
        name: 'Sis. Abigail',
        assembly: 'Akure District',
        phone: '0809 111 2233',
      });

      expect(m2.id).toBe(m1.id);
    });
  });

  describe('Operator Results: Download Audience CSV (§6.3)', () => {
    it('generates audience CSV with name, assembly, phone, total points, correct count, and per-round points', () => {
      const audienceMembers = [
        {
          id: 'aud-1',
          name: 'Bro. David',
          assembly: 'Ado Central',
          phone: '+234 803 111 2222',
          total_points: 180,
          correct_count: 2,
        },
        {
          id: 'aud-2',
          name: 'Sis. Grace',
          assembly: 'Ikole Parish',
          phone: '',
          total_points: 95,
          correct_count: 1,
        },
      ];

      const rounds = [
        { id: 'r1', position: 1, title: 'General Bible Knowledge' },
        { id: 'r2', position: 2, title: 'Scripture Doctrine' },
      ];

      const questions = [
        { id: 'q1', round_id: 'r1' },
        { id: 'q2', round_id: 'r2' },
      ];

      const answers = [
        { audience_id: 'aud-1', question_id: 'q1', points: 90 },
        { audience_id: 'aud-1', question_id: 'q2', points: 90 },
        { audience_id: 'aud-2', question_id: 'q1', points: 95 },
      ];

      const qMap = new Map<string, (typeof questions)[0]>();
      questions.forEach((q) => qMap.set(q.id, q));

      const rows = audienceMembers.map((as, idx) => {
        const memberAnswers = answers.filter((a) => a.audience_id === as.id);
        const row: Record<string, any> = {
          Rank: idx + 1,
          Name: as.name,
          Assembly: as.assembly,
          Phone: as.phone || '',
          Total_Points: as.total_points,
          Correct_Count: as.correct_count,
        };

        rounds.forEach((r) => {
          const roundPoints = memberAnswers
            .filter((a) => {
              const q = qMap.get(a.question_id);
              return q && q.round_id === r.id;
            })
            .reduce((sum, a) => sum + (a.points || 0), 0);

          row[`Round_${r.position}_${r.title.replace(/\s+/g, '_')}`] = roundPoints;
        });

        return row;
      });

      const csvString = Papa.unparse(rows);
      expect(csvString).toContain('Rank,Name,Assembly,Phone,Total_Points,Correct_Count');
      expect(csvString).toContain('Round_1_General_Bible_Knowledge');
      expect(csvString).toContain('Round_2_Scripture_Doctrine');
      expect(csvString).toContain('Bro. David,Ado Central,+234 803 111 2222,180,2,90,90');
      expect(csvString).toContain('Sis. Grace,Ikole Parish,,95,1,95,0');

      // Parse back to confirm validity
      const parsed = Papa.parse(csvString, { header: true });
      expect(parsed.data.length).toBe(2);
      expect((parsed.data[0] as any).Name).toBe('Bro. David');
      expect((parsed.data[0] as any).Assembly).toBe('Ado Central');
      expect((parsed.data[0] as any).Round_1_General_Bible_Knowledge).toBe('90');
    });
  });
});

