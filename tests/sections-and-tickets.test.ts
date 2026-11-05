import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { contentRepository } from '../src/repositories/content.repository';
import { INITIAL_SERVICES } from '../src/repositories/seed.data';
import { ServiceSchema, SectionContentSchema, RepairTicketSchema } from '../src/schemas';
import {
  generateTicketNumber,
  buildRepairTicketEmailHtml,
  dispatchRepairTicketEmails,
} from '../src/lib/repair-tickets';
import { GET as getSections, PUT as putSections } from '../src/pages/api/sections';
import { POST as postServiceTicket } from '../src/pages/api/service-ticket';
import { authRepository } from '../src/repositories/auth.repository';
import { contactRateLimiter } from '../src/lib/security';
import * as supabaseLib from '../src/lib/supabase';

describe('CMS Editable Section Descriptions & Service Repair Tickets Suite', () => {
  beforeEach(() => {
    contentRepository.resetToSeed();
    contactRateLimiter.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    supabaseLib.setSupabaseClient(null as any);
  });

  it('validates all seeded services (2 published ticket services + 3 disabled services) against ServiceSchema', () => {
    expect(INITIAL_SERVICES.length).toBe(5);
    INITIAL_SERVICES.forEach((srv) => {
      const parsed = ServiceSchema.safeParse(srv);
      expect(parsed.success).toBe(true);
    });

    const publicServices = INITIAL_SERVICES.filter((s) => s.published);
    expect(publicServices.length).toBe(2);
    expect(publicServices.map((s) => s.slug)).toEqual([
      'reparaciones-sistema-ticket',
      'modificaciones-de-pedales',
    ]);
  });

  describe('Editable Section Content (Repository + API + Supabase Fallbacks)', () => {
    it('retrieves and updates section descriptions via GET and authenticated PUT /api/sections', async () => {
      const getAllRes = await getSections({ url: new URL('http://localhost/api/sections') } as any);
      expect(getAllRes.status).toBe(200);
      const allJson = await getAllRes.json();
      expect(allJson.data).toHaveLength(3);

      const getOneRes = await getSections({
        url: new URL('http://localhost/api/sections?category=servicios'),
      } as any);
      const oneJson = await getOneRes.json();
      expect(oneJson.data.title).toBe('SERVICIOS TÉCNICOS & MODS');

      // Block unauthorized PUT
      const unauthReq = new Request('http://localhost/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'servicios',
          title: 'NUEVO TÍTULO',
          descriptions: ['Nuevo párrafo descriptivo válido.'],
        }),
      });
      const unauthRes = await putSections({ request: unauthReq } as any);
      expect(unauthRes.status).toBe(401);

      // Authenticated PUT
      const login = await authRepository.login({
        email: 'admin@mumutech.com',
        password: 'mumutech2026',
      });

      const invalidReq = new Request('http://localhost/api/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${login.token}`,
        },
        body: JSON.stringify({
          category: 'servicios',
          title: 'A',
          descriptions: [],
        }),
      });
      const invalidRes = await putSections({ request: invalidReq } as any);
      expect(invalidRes.status).toBe(400);

      const validPayload = {
        category: 'cosas-interesantes',
        title: 'EXPERIMENTOS SONOROS & HARDWARE LIBRE',
        descriptions: [
          'Primer párrafo actualizado desde el CMS.',
          'Segundo párrafo con información de circuitos experimentales.',
        ],
      };
      expect(SectionContentSchema.safeParse(validPayload).success).toBe(true);

      const validReq = new Request('http://localhost/api/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${login.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      const validRes = await putSections({ request: validReq } as any);
      expect(validRes.status).toBe(200);

      const updated = await contentRepository.getSectionContent('cosas-interesantes');
      expect(updated.title).toBe('EXPERIMENTOS SONOROS & HARDWARE LIBRE');
      expect(updated.descriptions).toHaveLength(2);
    });

    it('syncs section reads/updates and handles errors gracefully with mocked Supabase', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const selectMock = vi.fn().mockResolvedValue({
        data: [
          {
            category: 'educativa',
            title: 'TALLERES DESDE SUPABASE',
            descriptions: ['Párrafo remoto desde DB.'],
            updatedAt: '2026-11-05T15:00:00Z',
          },
        ],
        error: null,
      });

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          select: selectMock,
          upsert: upsertMock,
        }),
      } as any);

      const edu = await contentRepository.getSectionContent('educativa');
      expect(edu.title).toBe('TALLERES DESDE SUPABASE');

      await contentRepository.updateSectionContent({
        category: 'educativa',
        title: 'TÍTULO ACTUALIZADO',
        descriptions: ['Párrafo actualizado.'],
      });
      expect(upsertMock).toHaveBeenCalledTimes(1);

      // Error fallback
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockRejectedValue(new Error('DB select fail')),
          upsert: vi.fn().mockRejectedValue(new Error('DB upsert fail')),
        }),
      } as any);

      const fallbackEdu = await contentRepository.getSectionContent('educativa');
      expect(fallbackEdu.title).toBe('TÍTULO ACTUALIZADO');
      const fallbackSave = await contentRepository.updateSectionContent({
        category: 'servicios',
        title: 'SERVICIOS FALLBACK',
        descriptions: ['Descripción en memoria cuando falla red.'],
      });
      expect(fallbackSave.title).toBe('SERVICIOS FALLBACK');
    });
  });

  describe('Repair Ticket Generation, Email Dispatch & Endpoint', () => {
    it('generates formatted ticket numbers and builds escaped HTML emails for client and admin', () => {
      const fixedDate = new Date('2026-11-05T14:00:00Z');
      expect(generateTicketNumber(fixedDate, '9k2p')).toBe('MTK-20261105-9K2P');
      expect(generateTicketNumber(fixedDate)).toMatch(/^MTK-20261105-[A-Z2-9]{4}$/);

      const clientHtml = buildRepairTicketEmailHtml(
        {
          ticketNumber: 'MTK-20261105-7X3Q',
          serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
          clientName: 'Kevin <Shields>',
          clientEmail: 'kevin@mbv.org',
          equipmentBrandModel: 'Fender Jazzmaster / Marshall ShredMaster',
          symptomsDescription: 'Corte intermitente en el switch <script>alert(1)</script>',
          diagnosticFee: 15000,
        },
        'client_ticket'
      );

      expect(clientHtml).toContain('MTK-20261105-7X3Q');
      expect(clientHtml).toContain('$15.000 CLP');
      expect(clientHtml).toContain('VALORES E INFORMACIÓN DE COTIZACIÓN');
      expect(clientHtml).not.toContain('<script>');

      const modHtml = buildRepairTicketEmailHtml(
        {
          ticketNumber: 'MTK-20261105-MOD1',
          serviceTitle: 'MODIFICACIONES DE PEDALES',
          clientName: 'Robert Smith',
          clientEmail: 'robert@thecure.com',
          equipmentBrandModel: 'Boss BD-2 Blues Driver',
          symptomsDescription: 'Mod Phat para reforzar graves.',
          diagnosticFee: 25000,
        },
        'client_ticket'
      );
      expect(modHtml).toContain('TICKET DE MODIFICACIÓN GENERADO');
      expect(modHtml).toContain('$25.000 CLP');

      const adminHtml = buildRepairTicketEmailHtml(
        {
          ticketNumber: 'MTK-20261105-7X3Q',
          serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
          clientName: 'Kevin Shields',
          clientEmail: 'kevin@mbv.org',
          equipmentBrandModel: 'Marshall ShredMaster',
          symptomsDescription: 'Falla en jack de entrada.',
          pricingNotes: ['Nota personalizada de cotización.'],
        },
        'admin_ticket'
      );
      expect(adminHtml).toContain('NUEVO TICKET DE REPARACIÓN');
      expect(adminHtml).toContain('Marshall ShredMaster');
    });

    it('dispatches admin and client ticket emails via Resend and handles missing key or network failures', async () => {
      const sampleParams = {
        ticketNumber: 'MTK-20261105-ABCD',
        serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
        clientName: 'Johnny Marr',
        clientEmail: 'johnny@smiths.co.uk',
        equipmentBrandModel: 'Boss CE-2 Japan',
        symptomsDescription: 'No enciende con fuente de 9V estándar PSA.',
        diagnosticFee: 15000,
      };

      const skipped = await dispatchRepairTicketEmails(sampleParams, {
        apiKey: undefined,
        fromEmail: 'Mumu Tech <servicio@mumutech.cl>',
        adminEmail: 'hola@mumutech.cl',
      });
      expect(skipped).toEqual({ adminNotified: false, clientTicketSent: false });

      const fetchOk = vi.fn().mockResolvedValue({ ok: true });
      const sent = await dispatchRepairTicketEmails(sampleParams, {
        apiKey: 're_test_key',
        fromEmail: 'Mumu Tech <servicio@mumutech.cl>',
        adminEmail: 'hola@mumutech.cl',
        fetchImpl: fetchOk as any,
      });
      expect(sent).toEqual({ adminNotified: true, clientTicketSent: true });
      expect(fetchOk).toHaveBeenCalledTimes(2);

      const fetchFail = vi.fn().mockRejectedValue(new Error('Network down'));
      const failed = await dispatchRepairTicketEmails(sampleParams, {
        apiKey: 're_test_key',
        fromEmail: 'Mumu Tech <servicio@mumutech.cl>',
        adminEmail: 'hola@mumutech.cl',
        fetchImpl: fetchFail as any,
      });
      expect(failed).toEqual({ adminNotified: false, clientTicketSent: false });
    });

    it('creates repair tickets via POST /api/service-ticket (JSON & FormData), blocks unpublished services, honeypot, and invalid payloads', async () => {
      const validPayload = {
        serviceId: 'srv-ticket-001',
        serviceSlug: 'reparaciones-sistema-ticket',
        serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
        clientName: 'Kim Gordon',
        clientEmail: 'kim@sonicyouth.com',
        equipmentBrandModel: 'ProCo RAT Vintage',
        symptomsDescription: 'El potenciómetro de Filter mete ruido y pierde volumen a la mitad del recorrido.',
      };
      expect(RepairTicketSchema.safeParse(validPayload).success).toBe(true);

      const jsonReq = new Request('http://localhost/api/service-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      const res = await postServiceTicket({ request: jsonReq } as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.ticketNumber).toMatch(/^MTK-\d{8}-[A-Z2-9]{4}$/);

      // FormData submission
      const fd = new FormData();
      Object.entries(validPayload).forEach(([k, v]) => fd.set(k, v));
      const fdReq = new Request('http://localhost/api/service-ticket', {
        method: 'POST',
        body: fd,
      });
      const fdRes = await postServiceTicket({ request: fdReq } as any);
      expect(fdRes.status).toBe(201);

      const tickets = await contentRepository.getRepairTickets();
      expect(tickets.length).toBe(2);

      // Disabled service returns 404
      const disabledReq = new Request('http://localhost/api/service-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          serviceId: 'srv-001',
          serviceSlug: 'reparacion-calibracion-pedales',
        }),
      });
      const disabledRes = await postServiceTicket({ request: disabledReq } as any);
      expect(disabledRes.status).toBe(404);

      // Honeypot silently succeeds without creating a ticket
      const botReq = new Request('http://localhost/api/service-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          website: 'https://spam.bot',
        }),
      });
      const botRes = await postServiceTicket({ request: botReq } as any);
      expect(botRes.status).toBe(200);
      expect((await contentRepository.getRepairTickets()).length).toBe(2);

      // Invalid payload returns 400
      const badReq = new Request('http://localhost/api/service-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: 'A', clientEmail: 'bad' }),
      });
      const badRes = await postServiceTicket({ request: badReq } as any);
      expect(badRes.status).toBe(400);
    });

    it('persists and retrieves repair tickets with mocked Supabase and handles DB errors gracefully', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const orderMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'tkt-db-1',
            ticketNumber: 'MTK-20261105-DB99',
            serviceId: 'srv-ticket-001',
            serviceSlug: 'reparaciones-sistema-ticket',
            serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
            clientName: 'J Mascis',
            clientEmail: 'j@dinosaurjr.com',
            equipmentBrandModel: 'Electro-Harmonix Ram Head Big Muff',
            symptomsDescription: 'Footswitch intermitente.',
            status: 'recibido',
            createdAt: '2026-11-05T15:00:00Z',
          },
        ],
        error: null,
      });

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          insert: insertMock,
          select: vi.fn().mockReturnValue({ order: orderMock }),
        }),
      } as any);

      await contentRepository.saveRepairTicket({
        ticketNumber: 'MTK-20261105-DB99',
        serviceId: 'srv-ticket-001',
        serviceSlug: 'reparaciones-sistema-ticket',
        serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
        clientName: 'J Mascis',
        clientEmail: 'j@dinosaurjr.com',
        equipmentBrandModel: 'Electro-Harmonix Ram Head Big Muff',
        symptomsDescription: 'Footswitch intermitente.',
        status: 'recibido',
      });
      expect(insertMock).toHaveBeenCalledTimes(1);

      const fromDb = await contentRepository.getRepairTickets();
      expect(fromDb[0].ticketNumber).toBe('MTK-20261105-DB99');

      // Error fallback path
      supabaseLib.setSupabaseClient({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockRejectedValue(new Error('Insert failed')),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Select failed')),
          }),
        }),
      } as any);

      await contentRepository.saveRepairTicket({
        ticketNumber: 'MTK-20261105-MEM1',
        serviceId: 'srv-ticket-001',
        serviceSlug: 'reparaciones-sistema-ticket',
        serviceTitle: 'REPARACIONES CON SISTEMA DE TICKET',
        clientName: 'Thurston Moore',
        clientEmail: 'thurston@sy.com',
        equipmentBrandModel: 'MXR Blue Box',
        symptomsDescription: 'Caída fuerte de volumen al activar el octavador.',
        status: 'recibido',
      });

      const memFallback = await contentRepository.getRepairTickets();
      expect(memFallback.some((t) => t.ticketNumber === 'MTK-20261105-MEM1')).toBe(true);
    });
  });
});

