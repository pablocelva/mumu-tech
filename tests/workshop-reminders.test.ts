import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkshopSchema, WorkshopRegistrationSchema } from '../src/schemas';
import { INITIAL_WORKSHOPS } from '../src/repositories/seed.data';
import {
  calculateReminderSchedule,
  buildWorkshopEmailHtml,
  dispatchWorkshopEmailsAndNewsletter,
  SEVEN_DAYS_MS,
} from '../src/lib/workshop-reminders';
import { contentRepository } from '../src/repositories/content.repository';
import * as supabaseLib from '../src/lib/supabase';
import { POST as workshopRegisterHandler } from '../src/pages/api/workshop-register';
import { contactRateLimiter } from '../src/lib/security';

describe('Dedicated Workshop Route, Registration & Resend 7-Day Reminder Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    supabaseLib.setSupabaseClient(null);
    contentRepository.resetToSeed();
    contactRateLimiter.reset();
  });

  afterEach(() => {
    supabaseLib.setSupabaseClient(null);
  });

  describe('Modular Workshop Seed & Schemas', () => {
    it('should validate all enriched INITIAL_WORKSHOPS against WorkshopSchema', () => {
      expect(INITIAL_WORKSHOPS.length).toBeGreaterThanOrEqual(3);
      for (const ws of INITIAL_WORKSHOPS) {
        const parsed = WorkshopSchema.safeParse(ws);
        expect(parsed.success).toBe(true);
        expect((ws.stages || []).length).toBeGreaterThan(0);
        expect((ws.learningOutcomes || []).length).toBeGreaterThan(0);
        expect((ws.upcomingDates || []).length).toBeGreaterThan(0);
        expect((ws.audioDemos || []).length).toBe(3);
        expect((ws.pastEditions || []).length).toBeGreaterThan(0);
      }
    });

    it('should validate WorkshopRegistrationSchema with optional email omitted or provided', () => {
      const withoutEmail = WorkshopRegistrationSchema.safeParse({
        workshopId: 'ws-001',
        workshopSlug: 'construccion-pedal-fuzz-germanio',
        workshopTitle: 'CONSTRUCCIÓN DE PEDAL FUZZ GERMANIO DIY',
        selectedDateIso: '2026-11-21T10:00:00-03:00',
        selectedDateLabel: 'Sábado 21 de Noviembre',
        name: 'Jimi Hendrix',
        email: '',
        phone: '+56 9 8765 4321',
        subscribeNewsletter: false,
      });
      expect(withoutEmail.success).toBe(true);

      const withEmail = WorkshopRegistrationSchema.safeParse({
        workshopId: 'ws-001',
        workshopSlug: 'construccion-pedal-fuzz-germanio',
        workshopTitle: 'CONSTRUCCIÓN DE PEDAL FUZZ GERMANIO DIY',
        selectedDateIso: '2026-11-21T10:00:00-03:00',
        selectedDateLabel: 'Sábado 21 de Noviembre',
        name: 'Kevin Shields',
        email: 'kevin@mbv.org',
        phone: '+56911223344',
        subscribeNewsletter: true,
      });
      expect(withEmail.success).toBe(true);

      const missingPhone = WorkshopRegistrationSchema.safeParse({
        workshopId: 'ws-001',
        workshopSlug: 'construccion-pedal-fuzz-germanio',
        workshopTitle: 'CONSTRUCCIÓN DE PEDAL FUZZ GERMANIO DIY',
        selectedDateIso: '2026-11-21T10:00:00-03:00',
        selectedDateLabel: 'Sábado 21 de Noviembre',
        name: 'Kevin Shields',
        phone: '123',
      });
      expect(missingPhone.success).toBe(false);
    });
  });

  describe('calculateReminderSchedule (1 week before workshop)', () => {
    const fixedNow = Date.parse('2026-11-05T12:00:00Z');

    it('returns skipped_no_email when optional email is absent', () => {
      const calc = calculateReminderSchedule('2026-11-21T10:00:00Z', false, fixedNow);
      expect(calc.status).toBe('skipped_no_email');
      expect(calc.reminderScheduledAt).toBeUndefined();
    });

    it('returns scheduled_resend when reminder date is within 30 days', () => {
      // Workshop in 16 days => reminder in 9 days (<= 30 days)
      const workshopIso = '2026-11-21T12:00:00.000Z';
      const calc = calculateReminderSchedule(workshopIso, true, fixedNow);
      expect(calc.status).toBe('scheduled_resend');
      expect(calc.reminderScheduledAt).toBe(
        new Date(Date.parse(workshopIso) - SEVEN_DAYS_MS).toISOString()
      );
    });

    it('returns queued_for_cron when reminder date is more than 30 days in the future', () => {
      // Workshop in 60 days => reminder in 53 days (> 30 days Resend limit)
      const workshopIso = '2027-01-05T12:00:00.000Z';
      const calc = calculateReminderSchedule(workshopIso, true, fixedNow);
      expect(calc.status).toBe('queued_for_cron');
      expect(calc.reminderScheduledAt).toBeDefined();
    });

    it('returns too_close_for_7d_reminder when workshop is less than 7 days away or date invalid', () => {
      const closeCalc = calculateReminderSchedule('2026-11-09T12:00:00Z', true, fixedNow);
      expect(closeCalc.status).toBe('too_close_for_7d_reminder');

      const invalidCalc = calculateReminderSchedule('not-a-valid-date', true, fixedNow);
      expect(invalidCalc.status).toBe('too_close_for_7d_reminder');
    });
  });

  describe('Branded Email Builder & Resend Dispatch', () => {
    it('escapes HTML entities across confirmation, reminder_7d, and admin_notice templates', () => {
      const base = {
        participantName: '<script>alert(1)</script>Ana',
        workshopTitle: 'Fuzz & Synth',
        selectedDateLabel: 'Sábado 21 Nov',
        phone: '+56912345678',
      };

      const confirmHtml = buildWorkshopEmailHtml(base, 'confirmation');
      const reminderHtml = buildWorkshopEmailHtml({ ...base, email: 'ana@test.cl' }, 'reminder_7d');
      const adminHtml = buildWorkshopEmailHtml(base, 'admin_notice');

      expect(confirmHtml).not.toContain('<script>');
      expect(confirmHtml).toContain('&lt;script&gt;');
      expect(reminderHtml).toContain('RECORDATORIO');
      expect(adminHtml).toContain('NUEVO INSCRITO');
    });

    it('returns false flags immediately when RESEND_API_KEY is not configured', async () => {
      const res = await dispatchWorkshopEmailsAndNewsletter(
        {
          participantName: 'Pedro',
          workshopTitle: 'Taller Fuzz',
          selectedDateLabel: 'Sábado 21 Nov',
          phone: '+56999998888',
          email: 'pedro@test.cl',
          subscribeNewsletter: true,
          reminder: { status: 'scheduled_resend', reminderScheduledAt: '2026-11-14T10:00:00Z' },
        },
        {
          apiKey: undefined,
          fromEmail: 'Mumu <talleres@mumutech.cl>',
          adminEmail: 'hola@mumutech.cl',
        }
      );

      expect(res).toEqual({
        adminNotified: false,
        confirmationSent: false,
        reminderScheduledInResend: false,
        newsletterSynced: false,
      });
    });

    it('dispatches admin notice, confirmation, scheduled 7d reminder, and Resend Audience contact when configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });

      const res = await dispatchWorkshopEmailsAndNewsletter(
        {
          participantName: 'Clara Rockmore',
          workshopTitle: 'Sintetizador CMOS',
          selectedDateLabel: 'Sábado 28 Nov',
          phone: '+56912345678',
          email: 'clara@theremin.org',
          subscribeNewsletter: true,
          reminder: { status: 'scheduled_resend', reminderScheduledAt: '2026-11-21T15:00:00.000Z' },
        },
        {
          apiKey: 're_test_key_123',
          fromEmail: 'Mumu <talleres@mumutech.cl>',
          adminEmail: 'hola@mumutech.cl',
          audienceId: 'aud_999',
          fetchImpl: mockFetch as unknown as typeof fetch,
        }
      );

      expect(res).toEqual({
        adminNotified: true,
        confirmationSent: true,
        reminderScheduledInResend: true,
        newsletterSynced: true,
      });
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify 3rd call includes scheduled_at
      const thirdCallBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(thirdCallBody.scheduled_at).toBe('2026-11-21T15:00:00.000Z');
    });

    it('notifies only admin when participant omits optional email and handles network failures safely', async () => {
      const okOnlyFirstFetch = vi.fn().mockResolvedValue({ ok: true });
      const noEmailRes = await dispatchWorkshopEmailsAndNewsletter(
        {
          participantName: 'Solo Telefono',
          workshopTitle: 'Soldadura',
          selectedDateLabel: 'Sábado 14 Nov',
          phone: '+56911112222',
          subscribeNewsletter: true,
          reminder: { status: 'skipped_no_email' },
        },
        {
          apiKey: 're_test_key_123',
          fromEmail: 'Mumu <talleres@mumutech.cl>',
          adminEmail: 'hola@mumutech.cl',
          audienceId: 'aud_999',
          fetchImpl: okOnlyFirstFetch as unknown as typeof fetch,
        }
      );

      expect(noEmailRes.adminNotified).toBe(true);
      expect(noEmailRes.confirmationSent).toBe(false);
      expect(okOnlyFirstFetch).toHaveBeenCalledTimes(1);

      const failingFetch = vi.fn().mockRejectedValue(new Error('Network down'));
      const failRes = await dispatchWorkshopEmailsAndNewsletter(
        {
          participantName: 'Falla Red',
          workshopTitle: 'Soldadura',
          selectedDateLabel: 'Sábado 14 Nov',
          phone: '+56911112222',
          email: 'falla@red.cl',
          subscribeNewsletter: true,
          reminder: { status: 'scheduled_resend', reminderScheduledAt: '2026-11-14T10:00:00Z' },
        },
        {
          apiKey: 're_test_key_123',
          fromEmail: 'Mumu <talleres@mumutech.cl>',
          adminEmail: 'hola@mumutech.cl',
          audienceId: 'aud_999',
          fetchImpl: failingFetch as unknown as typeof fetch,
        }
      );

      expect(failRes).toEqual({
        adminNotified: false,
        confirmationSent: false,
        reminderScheduledInResend: false,
        newsletterSynced: false,
      });
    });
  });

  describe('ContentRepository Workshop Registrations & Supabase Fallbacks', () => {
    it('saves and retrieves workshop registrations in memory and via Supabase', async () => {
      const savedLocal = await contentRepository.saveWorkshopRegistration({
        workshopId: 'ws-001',
        workshopSlug: 'construccion-pedal-fuzz-germanio',
        workshopTitle: 'Fuzz Germanio',
        selectedDateLabel: 'Sábado 21 Nov',
        selectedDateIso: '2026-11-21T10:00:00-03:00',
        name: 'Wendy Carlos',
        email: 'wendy@moog.com',
        phone: '+56944556677',
        subscribeNewsletter: true,
        reminderStatus: 'scheduled_resend',
        reminderScheduledAt: '2026-11-14T13:00:00.000Z',
      });

      expect(savedLocal.id).toContain('reg-');
      const localList = await contentRepository.getWorkshopRegistrations();
      expect(localList.length).toBe(1);

      // With mocked Supabase online
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const orderMock = vi.fn().mockResolvedValue({ data: [savedLocal], error: null });
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          insert: insertMock,
          select: vi.fn().mockReturnValue({ order: orderMock }),
        }),
      } as any);
      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      await contentRepository.saveWorkshopRegistration({
        workshopId: 'ws-002',
        workshopSlug: 'sintetizador-ruido-osciladores-cmos',
        workshopTitle: 'CMOS Synth',
        selectedDateLabel: 'Sábado 28 Nov',
        selectedDateIso: '2026-11-28T15:00:00-03:00',
        name: 'Suzanne Ciani',
        phone: '+56988776655',
        subscribeNewsletter: false,
        reminderStatus: 'skipped_no_email',
      });
      expect(insertMock).toHaveBeenCalled();

      const onlineList = await contentRepository.getWorkshopRegistrations();
      expect(onlineList.length).toBe(1);

      // Graceful fallback on Supabase error
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockRejectedValue(new Error('Insert error')),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Select error')),
          }),
        }),
      } as any);

      const fallbackSaved = await contentRepository.saveWorkshopRegistration({
        workshopId: 'ws-003',
        workshopSlug: 'fundamentos-diagnostico-soldadura',
        workshopTitle: 'Soldadura',
        selectedDateLabel: 'Sábado 14 Nov',
        selectedDateIso: '2026-11-14T10:30:00-03:00',
        name: 'Daphne Oram',
        phone: '+56922334455',
        subscribeNewsletter: false,
        reminderStatus: 'skipped_no_email',
      });
      expect(fallbackSaved.name).toBe('Daphne Oram');

      const fallbackList = await contentRepository.getWorkshopRegistrations();
      expect(fallbackList.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/workshop-register Endpoint', () => {
    it('registers participant via JSON (with and without optional email) and FormData', async () => {
      const jsonReq = new Request('http://localhost/api/workshop-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId: 'ws-001',
          workshopSlug: 'construccion-pedal-fuzz-germanio',
          workshopTitle: 'CONSTRUCCIÓN DE PEDAL FUZZ GERMANIO DIY',
          selectedDateIso: '2026-11-21T10:00:00-03:00',
          selectedDateLabel: 'Sábado 21 de Noviembre',
          name: ' Thurston Moore ',
          email: 'thurston@sonicyouth.com',
          phone: '+56 9 7788 9900',
          subscribeNewsletter: true,
        }),
      });

      const res1 = await workshopRegisterHandler({ request: jsonReq } as any);
      const body1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(body1.success).toBe(true);
      expect(body1.message).not.toContain('recordatorio');
      expect(body1.data.registration.reminderStatus).toBeDefined();

      // Native FormData submission without email
      const fd = new FormData();
      fd.set('workshopId', 'ws-002');
      fd.set('workshopSlug', 'sintetizador-ruido-osciladores-cmos');
      fd.set('workshopTitle', 'SINTETIZADOR DE RUIDO & OSCILADORES 40106 CMOS');
      fd.set('selectedDate', '2026-11-28T15:00:00-03:00||Sábado 28 de Noviembre');
      fd.set('name', 'Kim Gordon');
      fd.set('phone', '+56 9 6655 4433');

      const formReq = new Request('http://localhost/api/workshop-register', {
        method: 'POST',
        body: fd,
      });

      const res2 = await workshopRegisterHandler({ request: formReq } as any);
      const body2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(body2.data.registration.reminderStatus).toBe('skipped_no_email');
    });

    it('handles honeypot bots, validation errors (400), and rate limits (429)', async () => {
      const botReq = new Request('http://localhost/api/workshop-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bot',
          website: 'https://spam.bot',
        }),
      });
      const botRes = await workshopRegisterHandler({ request: botReq } as any);
      expect(botRes.status).toBe(200);
      expect((await contentRepository.getWorkshopRegistrations()).length).toBe(0);

      const badReq = new Request('http://localhost/api/workshop-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', phone: 'bad' }),
      });
      const badRes = await workshopRegisterHandler({ request: badReq } as any);
      expect(badRes.status).toBe(400);

      // Exhaust rate limit for a specific IP
      for (let i = 0; i < 5; i++) {
        await workshopRegisterHandler({
          request: new Request('http://localhost/api/workshop-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-nf-client-connection-ip': '203.0.113.55',
            },
            body: JSON.stringify({ website: 'trap' }),
          }),
        } as any);
      }

      const rateLimitedRes = await workshopRegisterHandler({
        request: new Request('http://localhost/api/workshop-register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nf-client-connection-ip': '203.0.113.55',
          },
          body: JSON.stringify({ website: 'trap' }),
        }),
      } as any);
      expect(rateLimitedRes.status).toBe(429);
    });
  });
});

