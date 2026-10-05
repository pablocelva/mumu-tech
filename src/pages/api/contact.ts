import type { APIRoute } from 'astro';
import { ContactFormSchema, NewsletterSubscribeSchema } from '../../schemas';
import { contentRepository } from '../../repositories/content.repository';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Check if it's a dedicated newsletter subscription
    if (body && !body.name && !body.message && body.email) {
      const newsletterValidated = NewsletterSubscribeSchema.safeParse(body);
      if (!newsletterValidated.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Ingresa un correo electrónico válido.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const saved = await contentRepository.saveContactMessage({
        name: 'Suscriptor Newsletter',
        email: newsletterValidated.data.email,
        interest: 'newsletter',
        message: 'Suscripción directa a Newsletter / Mailing list de novedades y talleres.',
        subscribeNewsletter: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: '¡Te has suscrito al mailing list! Te avisaremos de nuevos talleres y kits.',
          data: saved,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise validate full contact form
    const validated = ContactFormSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const saved = await contentRepository.saveContactMessage({
      name: validated.data.name,
      email: validated.data.email,
      phone: validated.data.phone || undefined,
      interest: validated.data.interest,
      message: validated.data.message,
      subscribeNewsletter: validated.data.subscribeNewsletter,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tu mensaje fue recibido. Nos pondremos en contacto pronto.',
        data: saved,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor procesando la solicitud.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
