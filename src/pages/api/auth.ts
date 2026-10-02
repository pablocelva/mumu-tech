import type { APIRoute } from 'astro';
import { AuthLoginSchema } from '../../schemas';
import { authRepository } from '../../repositories/auth.repository';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validated = AuthLoginSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { user, token, error } = await authRepository.login(validated.data);

    if (error || !user || !token) {
      return new Response(
        JSON.stringify({ success: false, error: error || 'Credenciales inválidas.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Autenticación exitosa',
        data: { user, token },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Error procesando la autenticación' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
