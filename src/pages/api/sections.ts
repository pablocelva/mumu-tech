import type { APIRoute } from 'astro';
import { SectionContentSchema } from '../../schemas';
import { contentRepository } from '../../repositories/content.repository';
import { authRepository } from '../../repositories/auth.repository';
import { extractSessionToken } from '../../lib/security';

export const prerender = false;

async function checkAuth(request: Request): Promise<boolean> {
  const token = extractSessionToken(request);
  if (!token) return false;
  const user = await authRepository.verifyToken(token);
  return Boolean(user);
}

export const GET: APIRoute = async ({ url }) => {
  const category = url.searchParams.get('category');

  if (category === 'educativa' || category === 'servicios' || category === 'cosas-interesantes') {
    const section = await contentRepository.getSectionContent(category);
    return new Response(JSON.stringify({ success: true, data: section }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sections = await contentRepository.getAllSections();
  return new Response(JSON.stringify({ success: true, data: sections }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const isAuthed = await checkAuth(request);
  if (!isAuthed) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const body = await request.json();
    const validated = SectionContentSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await contentRepository.updateSectionContent(validated.data);
    return new Response(
      JSON.stringify({
        success: true,
        data: updated,
        message: 'Textos de la sección actualizados correctamente.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Error al procesar los datos de la sección' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

