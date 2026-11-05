import { randomBytes } from 'node:crypto';
import { escapeHtml, sanitizeEmailHeader } from './security';

const TICKET_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Genera un número de ticket único y legible, ej: `MTK-20261105-7K4P`.
 */
export function generateTicketNumber(now: Date = new Date(), customSuffix?: string): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  let suffix = customSuffix;
  if (!suffix) {
    const bytes = randomBytes(4);
    suffix = Array.from(bytes)
      .map((b) => TICKET_ALPHABET[b % TICKET_ALPHABET.length])
      .join('');
  }

  return `MTK-${year}${month}${day}-${suffix.toUpperCase()}`;
}

export interface BrandedRepairTicketEmailParams {
  ticketNumber: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  equipmentBrandModel: string;
  symptomsDescription: string;
  diagnosticFee?: number;
  pricingNotes?: string[];
}

const DEFAULT_PRICING_NOTES = [
  'Revisión y diagnóstico inicial desde $15.000 CLP (abonable al total si apruebas la reparación).',
  'El presupuesto cerrado depende de las horas de intervención y repuestos tras revisar el equipo en banco.',
  'Ninguna reparación ni cobro adicional se realiza sin tu aprobación previa de la cotización.',
];

/**
 * Genera el HTML de correo tanto para el comprobante automático de ticket/cotización del cliente
 * como para la alerta interna del administrador.
 */
export function buildRepairTicketEmailHtml(
  params: BrandedRepairTicketEmailParams,
  kind: 'client_ticket' | 'admin_ticket'
): string {
  const safeTicket = escapeHtml(params.ticketNumber);
  const safeService = escapeHtml(params.serviceTitle);
  const safeName = escapeHtml(params.clientName);
  const safeEmail = escapeHtml(params.clientEmail);
  const safeEquipment = escapeHtml(params.equipmentBrandModel);
  const safeSymptoms = escapeHtml(params.symptomsDescription);

  const feeFormatted =
    params.diagnosticFee !== undefined
      ? `$${params.diagnosticFee.toLocaleString('es-CL')} CLP`
      : '$15.000 CLP';

  const notes =
    params.pricingNotes && params.pricingNotes.length > 0
      ? params.pricingNotes
      : DEFAULT_PRICING_NOTES;

  const notesHtml = notes
    .map((note) => `<li style="margin-bottom:8px;color:#d0d0e0;">${escapeHtml(note)}</li>`)
    .join('');

  if (kind === 'admin_ticket') {
    return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background-color:#0d0d15;color:#f2f2f8;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:600px;margin:0 auto;background-color:#161622;border:1px solid #2a2a3c;padding:28px;">
      <p style="margin:0 0 10px 0;font-family:monospace;font-size:12px;letter-spacing:1px;color:#00f0ff;">[ NUEVO TICKET DE REPARACIÓN · ${safeTicket} ]</p>
      <h1 style="margin:0 0 16px 0;font-size:21px;color:#ffffff;">Equipo: ${safeEquipment}</h1>
      <div style="background-color:#0d0d15;border-left:3px solid #00f0ff;padding:16px;margin:0 0 18px 0;font-family:monospace;font-size:13px;">
        <p style="margin:0 0 6px 0;"><strong>TICKET:</strong> ${safeTicket}</p>
        <p style="margin:0 0 6px 0;"><strong>SERVICIO:</strong> ${safeService}</p>
        <p style="margin:0 0 6px 0;"><strong>CLIENTE:</strong> ${safeName}</p>
        <p style="margin:0 0 6px 0;"><strong>CORREO:</strong> ${safeEmail}</p>
        <p style="margin:0;"><strong>EQUIPO:</strong> ${safeEquipment}</p>
      </div>
      <div style="background-color:#0d0d15;border:1px solid #2a2a3c;padding:16px;margin:0 0 18px 0;">
        <p style="margin:0 0 6px 0;font-family:monospace;font-size:12px;color:#ff94c2;"><strong>SÍNTOMAS / DESCRIPCIÓN DEL PROBLEMA:</strong></p>
        <p style="margin:0;color:#e6e6f2;white-space:pre-line;">${safeSymptoms}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#9999aa;font-family:monospace;">Responde directamente a este correo para coordinar recepción o enviar cotización al cliente.</p>
    </div>
  </body>
</html>`;
  }

  const isModService = params.serviceTitle.toUpperCase().includes('MODIFICACI');
  const clientBadge = isModService
    ? '[ TICKET DE MODIFICACIÓN GENERADO · MUMU TECH ]'
    : '[ TICKET DE REPARACIÓN GENERADO · MUMU TECH ]';
  const detailHeading = isModService ? 'MODIFICACIÓN SOLICITADA:' : 'SÍNTOMAS REPORTADOS:';
  const feeLabel = isModService ? 'Valor base referencial:' : 'Valor base de diagnóstico:';

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background-color:#0d0d15;color:#f2f2f8;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="max-width:600px;margin:0 auto;background-color:#161622;border:1px solid #2a2a3c;padding:28px;">
      <p style="margin:0 0 10px 0;font-family:monospace;font-size:12px;letter-spacing:1px;color:#00f0ff;">${clientBadge}</p>
      <h1 style="margin:0 0 12px 0;font-size:22px;color:#ffffff;">Hola ${safeName}, recibimos tu solicitud</h1>
      <p style="margin:0 0 18px 0;color:#d0d0e0;">Tu caso quedó ingresado con el siguiente número de seguimiento. Conserva este código para coordinar la recepción, revisión y cotización de tu equipo:</p>

      <div style="background-color:#0d0d15;border:1px solid #39ff14;padding:14px 18px;margin:0 0 20px 0;text-align:center;font-family:monospace;">
        <span style="display:block;font-size:11px;color:#9999aa;letter-spacing:1px;">NÚMERO DE TICKET</span>
        <strong style="font-size:20px;color:#39ff14;letter-spacing:1.5px;">${safeTicket}</strong>
      </div>

      <div style="background-color:#0d0d15;border-left:3px solid #ff2a85;padding:16px;margin:0 0 20px 0;font-family:monospace;font-size:13px;">
        <p style="margin:0 0 6px 0;"><strong>SERVICIO:</strong> ${safeService}</p>
        <p style="margin:0 0 6px 0;"><strong>EQUIPO (MARCA Y MODELO):</strong> ${safeEquipment}</p>
        <p style="margin:0;"><strong>${detailHeading}</strong> ${safeSymptoms}</p>
      </div>

      <h2 style="margin:0 0 10px 0;font-size:15px;font-family:monospace;color:#00f0ff;letter-spacing:0.5px;">[ VALORES E INFORMACIÓN DE COTIZACIÓN ]</h2>
      <p style="margin:0 0 10px 0;color:#ffffff;font-size:14px;"><strong>${feeLabel}</strong> ${feeFormatted}</p>
      <ul style="margin:0 0 20px 0;padding-left:20px;font-size:14px;">
        ${notesHtml}
      </ul>

      <p style="margin:0 0 16px 0;color:#d0d0e0;font-size:14px;">Te responderemos a este mismo correo indicando disponibilidad y dirección de recepción en Providencia (o datos para envío) para ingresar el equipo a banco de prueba.</p>
      <p style="margin:0;font-size:12px;color:#9999aa;font-family:monospace;">MUMU TECH · Servicio Técnico &amp; Electrónica de Audio</p>
    </div>
  </body>
</html>`;
}

export interface RepairTicketDispatchOptions {
  apiKey?: string;
  fromEmail: string;
  adminEmail: string;
  fetchImpl?: typeof fetch;
}

export interface RepairTicketDispatchResult {
  adminNotified: boolean;
  clientTicketSent: boolean;
}

/**
 * Envía mediante Resend API:
 * 1. Correo interno al administrador con los datos del equipo, síntomas y reply_to al cliente.
 * 2. Correo automático al cliente con su número de ticket, valores base e información de cotización.
 */
export async function dispatchRepairTicketEmails(
  params: BrandedRepairTicketEmailParams,
  options: RepairTicketDispatchOptions
): Promise<RepairTicketDispatchResult> {
  const result: RepairTicketDispatchResult = {
    adminNotified: false,
    clientTicketSent: false,
  };

  if (!options.apiKey) {
    return result;
  }

  const fetcher = options.fetchImpl ?? fetch;
  const headers = {
    Authorization: `Bearer ${options.apiKey}`,
    'Content-Type': 'application/json',
  };

  const cleanTicket = sanitizeEmailHeader(params.ticketNumber);
  const cleanEquipment = sanitizeEmailHeader(params.equipmentBrandModel);
  const cleanName = sanitizeEmailHeader(params.clientName);

  try {
    const adminRes = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: options.fromEmail,
        to: [options.adminEmail],
        reply_to: params.clientEmail,
        subject: `[Nuevo Ticket ${cleanTicket}] ${cleanEquipment} — ${cleanName}`,
        html: buildRepairTicketEmailHtml(params, 'admin_ticket'),
      }),
    });
    result.adminNotified = adminRes.ok;
  } catch {
    result.adminNotified = false;
  }

  try {
    const clientRes = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: options.fromEmail,
        to: [params.clientEmail],
        subject: `[Ticket ${cleanTicket}] Recepción y valores de cotización — ${cleanEquipment} | Mumu Tech`,
        html: buildRepairTicketEmailHtml(params, 'client_ticket'),
      }),
    });
    result.clientTicketSent = clientRes.ok;
  } catch {
    result.clientTicketSent = false;
  }

  return result;
}

