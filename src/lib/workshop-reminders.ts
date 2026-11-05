import type { ReminderScheduleStatus } from '../types';
import { escapeHtml, sanitizeEmailHeader } from './security';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Resend permite agendar correos con `scheduledAt` hasta un máximo de 30 días en el futuro.
 * Usamos un margen seguro de 29.9 días para evitar rechazos por deriva de reloj (clock skew).
 */
export const RESEND_MAX_SCHEDULE_WINDOW_MS = Math.floor(29.9 * 24 * 60 * 60 * 1000);

export interface ReminderCalculation {
  status: ReminderScheduleStatus;
  reminderScheduledAt?: string;
}

/**
 * Calcula si el recordatorio de 1 semana antes del taller puede programarse
 * directamente con `scheduledAt` de Resend (<= 30 días), si debe encolarse
 * para un Cron diario (> 30 días), o si faltan menos de 7 días.
 */
export function calculateReminderSchedule(
  workshopIsoDate: string,
  hasEmail: boolean,
  nowMs: number = Date.now()
): ReminderCalculation {
  if (!hasEmail) {
    return { status: 'skipped_no_email' };
  }

  const workshopMs = Date.parse(workshopIsoDate);
  if (Number.isNaN(workshopMs)) {
    return { status: 'too_close_for_7d_reminder' };
  }

  const reminderMs = workshopMs - SEVEN_DAYS_MS;
  const deltaUntilReminderMs = reminderMs - nowMs;

  // Si ya estamos a menos de 7 días (o menos de 5 minutos del corte de 7 días)
  if (deltaUntilReminderMs <= 5 * 60 * 1000) {
    return { status: 'too_close_for_7d_reminder' };
  }

  const reminderIso = new Date(reminderMs).toISOString();

  if (deltaUntilReminderMs <= RESEND_MAX_SCHEDULE_WINDOW_MS) {
    return {
      status: 'scheduled_resend',
      reminderScheduledAt: reminderIso,
    };
  }

  return {
    status: 'queued_for_cron',
    reminderScheduledAt: reminderIso,
  };
}

export interface BrandedWorkshopEmailParams {
  participantName: string;
  workshopTitle: string;
  selectedDateLabel: string;
  phone: string;
  email?: string;
}

/**
 * Genera el HTML con identidad Lo-Fi / Analog DIY de Mumu Tech para confirmación o recordatorio.
 */
export function buildWorkshopEmailHtml(
  params: BrandedWorkshopEmailParams,
  kind: 'confirmation' | 'reminder_7d' | 'admin_notice'
): string {
  const safeName = escapeHtml(params.participantName);
  const safeTitle = escapeHtml(params.workshopTitle);
  const safeDate = escapeHtml(params.selectedDateLabel);
  const safePhone = escapeHtml(params.phone);
  const safeEmail = escapeHtml(params.email || 'No informado (contacto vía teléfono/WhatsApp)');

  const badge =
    kind === 'confirmation'
      ? '[ INSCRIPCIÓN RECIBIDA · MUMU TECH ]'
      : kind === 'reminder_7d'
        ? '[ RECORDATORIO · FALTA 1 SEMANA ]'
        : '[ NUEVO INSCRITO EN TALLER ]';

  const headline =
    kind === 'confirmation'
      ? `¡Hola ${safeName}! Tu pre-inscripción está registrada`
      : kind === 'reminder_7d'
        ? `¡Nos vemos en 7 días, ${safeName}!`
        : `Nueva inscripción: ${safeName}`;

  const lead =
    kind === 'confirmation'
      ? 'Recibimos tus datos para el taller. Te contactaremos por WhatsApp/teléfono para confirmar los detalles finales del banco de trabajo.'
      : kind === 'reminder_7d'
        ? 'Falta exactamente 1 semana para nuestra sesión práctica en el laboratorio. Todos los componentes electrónicos y herramientas ya están reservados para ti.'
        : 'Un participante completó el formulario de inscripción desde la ruta dedicada del taller.';

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background-color:#0d0d15;color:#f2f2f8;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:580px;margin:0 auto;background-color:#161622;border:1px solid #2a2a3c;padding:28px;">
      <p style="margin:0 0 12px 0;font-family:monospace;font-size:12px;letter-spacing:1px;color:#00f0ff;">${badge}</p>
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#ffffff;">${headline}</h1>
      <p style="margin:0 0 20px 0;color:#d0d0e0;">${lead}</p>
      <div style="background-color:#0d0d15;border-left:3px solid #ff2a85;padding:16px;margin:0 0 20px 0;font-family:monospace;font-size:13px;">
        <p style="margin:0 0 6px 0;"><strong>TALLER:</strong> ${safeTitle}</p>
        <p style="margin:0 0 6px 0;"><strong>FECHA:</strong> ${safeDate}</p>
        <p style="margin:0 0 6px 0;"><strong>TELÉFONO:</strong> ${safePhone}</p>
        <p style="margin:0;"><strong>CORREO:</strong> ${safeEmail}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#9999aa;font-family:monospace;">MUMU TECH · Electrónica Analógica, Pedales DIY &amp; Sintetizadores</p>
    </div>
  </body>
</html>`;
}

export interface ResendDispatchOptions {
  apiKey?: string;
  fromEmail: string;
  adminEmail: string;
  audienceId?: string;
  fetchImpl?: typeof fetch;
}

export interface ResendDispatchResult {
  adminNotified: boolean;
  confirmationSent: boolean;
  reminderScheduledInResend: boolean;
  newsletterSynced: boolean;
}

/**
 * Orquesta los envíos con Resend REST API (sin requerir paquete pesado adicional):
 * 1. Aviso inmediato al administrador.
 * 2. Si el inscrito ingresó correo: confirmación inmediata + recordatorio agendado 7 días antes (`scheduledAt`) cuando está dentro de la ventana de 30 días de Resend.
 * 3. Si marcó suscripción al newsletter y existe `RESEND_AUDIENCE_ID`: alta en Resend Contacts.
 */
export async function dispatchWorkshopEmailsAndNewsletter(
  params: BrandedWorkshopEmailParams & {
    subscribeNewsletter: boolean;
    reminder: ReminderCalculation;
  },
  options: ResendDispatchOptions
): Promise<ResendDispatchResult> {
  const result: ResendDispatchResult = {
    adminNotified: false,
    confirmationSent: false,
    reminderScheduledInResend: false,
    newsletterSynced: false,
  };

  if (!options.apiKey) {
    return result;
  }

  const fetcher = options.fetchImpl ?? fetch;
  const headers = {
    Authorization: `Bearer ${options.apiKey}`,
    'Content-Type': 'application/json',
  };

  const cleanTitle = sanitizeEmailHeader(params.workshopTitle);
  const cleanName = sanitizeEmailHeader(params.participantName);

  // 1. Notificación al admin de Mumu Tech
  try {
    const adminRes = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: options.fromEmail,
        to: [options.adminEmail],
        subject: `[Taller] Nueva inscripción: ${cleanName} — ${cleanTitle}`,
        html: buildWorkshopEmailHtml(params, 'admin_notice'),
      }),
    });
    result.adminNotified = adminRes.ok;
  } catch {
    result.adminNotified = false;
  }

  // Si el correo del participante es opcional y no se ingresó, terminamos aquí
  if (!params.email) {
    return result;
  }

  // 2. Confirmación inmediata al participante
  try {
    const confirmRes = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: options.fromEmail,
        to: [params.email],
        subject: `Inscripción recibida: ${cleanTitle} | Mumu Tech`,
        html: buildWorkshopEmailHtml(params, 'confirmation'),
      }),
    });
    result.confirmationSent = confirmRes.ok;
  } catch {
    result.confirmationSent = false;
  }

  // 3. Recordatorio automático 1 semana antes vía `scheduledAt` (si está dentro de <= 30 días)
  if (params.reminder.status === 'scheduled_resend' && params.reminder.reminderScheduledAt) {
    try {
      const reminderRes = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: options.fromEmail,
          to: [params.email],
          subject: `Recordatorio (en 7 días): ${cleanTitle} | Mumu Tech`,
          html: buildWorkshopEmailHtml(params, 'reminder_7d'),
          scheduled_at: params.reminder.reminderScheduledAt,
        }),
      });
      result.reminderScheduledInResend = reminderRes.ok;
    } catch {
      result.reminderScheduledInResend = false;
    }
  }

  // 4. Alta opcional en Resend Audiences / Contacts para Newsletter
  if (params.subscribeNewsletter && options.audienceId) {
    try {
      const contactRes = await fetcher(
        `https://api.resend.com/audiences/${encodeURIComponent(options.audienceId)}/contacts`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: params.email,
            first_name: cleanName,
            unsubscribed: false,
          }),
        }
      );
      result.newsletterSynced = contactRes.ok;
    } catch {
      result.newsletterSynced = false;
    }
  }

  return result;
}

