import type { AdminUser } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { env } from '../lib/env';
import { signDevToken, verifyDevToken } from '../lib/security';
import type { AuthLoginData } from '../schemas';

// Default mock admin account strictly restricted to local development / test environments
const DEFAULT_DEV_ADMIN: AdminUser = {
  id: 'admin-dev-001',
  email: 'admin@mumutech.com',
  role: 'admin',
};

function isAuthorizedAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const allowlistRaw = env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!allowlistRaw) return true;

  const allowed = allowlistRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}

class AuthRepository {
  private allowDemoFallback: boolean = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'test');

  setAllowDemoFallback(allow: boolean): void {
    this.allowDemoFallback = allow;
  }

  async login(credentials: AuthLoginData): Promise<{ user: AdminUser | null; token: string | null; error?: string }> {
    const supabase = getSupabaseClient();

    // When Supabase is configured, NEVER fall through to local demo credentials
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user || !data.session) {
          return {
            user: null,
            token: null,
            error: error?.message || 'Credenciales inválidas.',
          };
        }

        const resolvedEmail = data.user.email || credentials.email;
        if (!isAuthorizedAdminEmail(resolvedEmail)) {
          return {
            user: null,
            token: null,
            error: 'Esta cuenta no tiene permisos de administrador.',
          };
        }

        return {
          user: {
            id: data.user.id,
            email: resolvedEmail,
            role: 'admin',
          },
          token: data.session.access_token,
        };
      } catch {
        return {
          user: null,
          token: null,
          error: 'Error de conexión con el servicio de autenticación.',
        };
      }
    }

    // Production guard: forbid demo credentials if Supabase is missing in production
    if (!this.allowDemoFallback) {
      return {
        user: null,
        token: null,
        error: 'Servicio de autenticación no configurado en producción.',
      };
    }

    // Development / test only fallback with HMAC-SHA256 signed token
    if (
      credentials.email === 'admin@mumutech.com' &&
      credentials.password === 'mumutech2026'
    ) {
      const signedToken = signDevToken(credentials.email, env.ADMIN_SESSION_SECRET);
      return {
        user: DEFAULT_DEV_ADMIN,
        token: signedToken,
      };
    }

    return {
      user: null,
      token: null,
      error: 'Credenciales inválidas.',
    };
  }

  async verifyToken(token: string): Promise<AdminUser | null> {
    if (!token) return null;

    const supabase = getSupabaseClient();

    // When Supabase is configured, strictly verify JWT against Supabase Auth (never accept dev tokens)
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user && isAuthorizedAdminEmail(user.email)) {
          return {
            id: user.id,
            email: user.email!,
            role: 'admin',
          };
        }
      } catch {
        return null;
      }
      return null;
    }

    // Development / test only HMAC token verification
    if (!this.allowDemoFallback) {
      return null;
    }

    const verifiedEmail = verifyDevToken(token, env.ADMIN_SESSION_SECRET);
    if (verifiedEmail === DEFAULT_DEV_ADMIN.email) {
      return DEFAULT_DEV_ADMIN;
    }

    return null;
  }
}

export const authRepository = new AuthRepository();
