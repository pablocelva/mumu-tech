import type { APIRoute } from 'astro';
import { ContentItemSchema } from '../../schemas';
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
    const items = await contentRepository.getItemsByCategory(category);
    return new Response(JSON.stringify({ success: true, data: items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const items = await contentRepository.getAllItems();
  return new Response(JSON.stringify({ success: true, data: items }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const isAuthed = await checkAuth(request);
  if (!isAuthed) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const body = await request.json();
    const validated = ContentItemSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const saved = await contentRepository.saveItem(validated.data);
    return new Response(JSON.stringify({ success: true, data: saved }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Error al procesar el contenido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const isAuthed = await checkAuth(request);
  if (!isAuthed) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'ID requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const deleted = await contentRepository.deleteItem(id);
  return new Response(JSON.stringify({ success: deleted }), {
    status: deleted ? 200 : 404,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
