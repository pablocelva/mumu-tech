import type { APIRoute } from 'astro';
import { WorkshopRegistrationSchema } from '../../schemas';
import { contentRepository } from '../../repositories/content.repository';
import { contactRateLimiter, getClientIp } from '../../lib/security';
import { env } from '../../lib/env';
import {
  calculateReminderSchedule,
  dispatchWorkshopEmailsAndNewsletter,
} from '../../lib/workshop-reminders';

export const prerender = false;

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  const dateCombo = String(formData.get('selectedDate') || '');
  const [comboIso = '', comboLabel = ''] = dateCombo.includes('||')
    ? dateCombo.split('||')
    : [String(formData.get('selectedDateIso') || ''), String(formData.get('selectedDateLabel') || '')];

  return {
    workshopId: String(formData.get('workshopId') || ''),
    workshopSlug: String(formData.get('workshopSlug') || ''),
    workshopTitle: String(formData.get('workshopTitle') || ''),
    selectedDateIso: comboIso,
    selectedDateLabel: comboLabel,
    name: String(formData.get('name') || ''),
    email: String(formData.get('email') || ''),
    phone: String(formData.get('phone') || ''),
    subscribeNewsletter:
      formData.get('subscribeNewsletter') === 'true' || formData.get('subscribeNewsletter') === 'on',
    website: String(formData.get('website') || ''),
  };
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rateCheck = contactRateLimiter.check(ip);

  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Has enviado demasiadas solicitudes recientemente. Intenta nuevamente en unos minutos.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const body = await parseRequestBody(request);

    // Anti-bot Honeypot check: descarta envíos automatizados silenciosamente
    if (body && typeof body.website === 'string' && body.website.trim().length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '¡Pre-inscripción recibida! Te contactaremos para confirmar tu cupo.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validated = WorkshopRegistrationSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = validated.data;
    const normalizedEmail = data.email && data.email.length > 0 ? data.email : undefined;
    const effectiveNewsletter = Boolean(normalizedEmail && data.subscribeNewsletter);

    const reminder = calculateReminderSchedule(data.selectedDateIso, Boolean(normalizedEmail));

    const savedRegistration = await contentRepository.saveWorkshopRegistration({
      workshopId: data.workshopId,
      workshopSlug: data.workshopSlug,
      workshopTitle: data.workshopTitle,
      selectedDateLabel: data.selectedDateLabel,
      selectedDateIso: data.selectedDateIso,
      name: data.name,
      email: normalizedEmail,
      phone: data.phone,
      subscribeNewsletter: effectiveNewsletter,
      reminderStatus: reminder.status,
      reminderScheduledAt: reminder.reminderScheduledAt,
    });

    // Registra también en bandeja unificada de mensajes del admin para visibilidad inmediata en /admin
    await contentRepository.saveContactMessage({
      name: data.name,
      email: normalizedEmail || 'sin-correo@registro-telefonico.local',
      phone: data.phone,
      interest: 'taller',
      message: `Inscripción a taller "${data.workshopTitle}" | Fecha elegida: ${data.selectedDateLabel} | Recordatorio 7d: ${reminder.status}`,
      subscribeNewsletter: effectiveNewsletter,
    });

    const emailDispatch = await dispatchWorkshopEmailsAndNewsletter(
      {
        participantName: data.name,
        workshopTitle: data.workshopTitle,
        selectedDateLabel: data.selectedDateLabel,
        phone: data.phone,
        email: normalizedEmail,
        subscribeNewsletter: effectiveNewsletter,
        reminder,
      },
      {
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.RESEND_FROM_EMAIL,
        adminEmail: env.RESEND_ADMIN_EMAIL,
        audienceId: env.RESEND_AUDIENCE_ID,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `¡Pre-inscripción registrada! Te escribiremos al ${data.phone} para confirmar tu cupo.`,
        data: {
          registration: savedRegistration,
          emailDispatch,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor procesando la inscripción.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

