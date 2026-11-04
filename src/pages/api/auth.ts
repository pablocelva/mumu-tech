import type { APIRoute } from 'astro';
import { AuthLoginSchema } from '../../schemas';
import { authRepository } from '../../repositories/auth.repository';
import {
  authRateLimiter,
  buildClearSessionCookie,
  buildSessionCookie,
  getClientIp,
} from '../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const rateCheck = authRateLimiter.check(ip);

  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const validated = AuthLoginSchema.safeParse(body);

    if (!validated.success) {
      const errorMsg = validated.error.issues.map((i) => i.message).join('. ');
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    const { user, token, error } = await authRepository.login(validated.data);

    if (error || !user || !token) {
      return new Response(
        JSON.stringify({ success: false, error: error || 'Credenciales inválidas.' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Autenticación exitosa',
        data: { user, token },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(token, Boolean(import.meta.env.PROD)),
          'Cache-Control': 'no-store, private',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Error procesando la autenticación' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }
};

export const DELETE: APIRoute = async () => {
  return new Response(
    JSON.stringify({ success: true, message: 'Sesión cerrada correctamente' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearSessionCookie(Boolean(import.meta.env.PROD)),
        'Cache-Control': 'no-store, private',
      },
    }
  );
};
