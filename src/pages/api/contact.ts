import type { APIRoute } from 'astro';
import { ContactFormSchema } from '../../schemas';
import { contentRepository } from '../../repositories/content.repository';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
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
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor procesando el contacto.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
