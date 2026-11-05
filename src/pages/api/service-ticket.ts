import type { APIRoute } from 'astro';
import { RepairTicketSchema } from '../../schemas';
import { contentRepository } from '../../repositories/content.repository';
import { contactRateLimiter, getClientIp } from '../../lib/security';
import { env } from '../../lib/env';
import { generateTicketNumber, dispatchRepairTicketEmails } from '../../lib/repair-tickets';
import type { ServiceItem } from '../../types';

export const prerender = false;

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  return {
    serviceId: String(formData.get('serviceId') || ''),
    serviceSlug: String(formData.get('serviceSlug') || ''),
    serviceTitle: String(formData.get('serviceTitle') || ''),
    clientName: String(formData.get('clientName') || ''),
    clientEmail: String(formData.get('clientEmail') || ''),
    equipmentBrandModel: String(formData.get('equipmentBrandModel') || ''),
    symptomsDescription: String(formData.get('symptomsDescription') || ''),
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

    // Anti-bot Honeypot: descarta envíos automatizados silenciosamente
    if (body && typeof body.website === 'string' && body.website.trim().length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Solicitud recibida.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validated = RepairTicketSchema.safeParse(body);
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = validated.data;
    const foundService = await contentRepository.getItemBySlug(data.serviceSlug);
    const serviceItem =
      foundService && foundService.category === 'servicios'
        ? (foundService as ServiceItem)
        : null;

    if (foundService && !foundService.published) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este servicio no se encuentra habilitado actualmente.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ticketNumber = generateTicketNumber();
    const diagnosticFee = serviceItem?.diagnosticFee ?? serviceItem?.startingPrice ?? 15000;

    const savedTicket = await contentRepository.saveRepairTicket({
      ticketNumber,
      serviceId: data.serviceId,
      serviceSlug: data.serviceSlug,
      serviceTitle: data.serviceTitle,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      equipmentBrandModel: data.equipmentBrandModel,
      symptomsDescription: data.symptomsDescription,
      status: 'recibido',
      diagnosticFeeSnapshot: diagnosticFee,
    });

    const emailDispatch = await dispatchRepairTicketEmails(
      {
        ticketNumber,
        serviceTitle: data.serviceTitle,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        equipmentBrandModel: data.equipmentBrandModel,
        symptomsDescription: data.symptomsDescription,
        diagnosticFee,
        pricingNotes: serviceItem?.pricingNotes,
      },
      {
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.RESEND_FROM_EMAIL,
        adminEmail: env.RESEND_ADMIN_EMAIL,
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: savedTicket,
        emailDispatch,
        message: `Ticket ${ticketNumber} generado. Te enviamos a ${data.clientEmail} el número de seguimiento junto con los valores e información de cotización.`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing repair ticket:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ocurrió un error al generar el ticket de reparación. Intenta nuevamente.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

