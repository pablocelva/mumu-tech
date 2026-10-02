import type { AdminUser } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { AuthLoginData } from '../schemas';

// Default mock admin credentials for zero-config demonstration / development
const DEFAULT_ADMIN: AdminUser = {
  id: 'admin-001',
  email: 'admin@mumutech.com',
  role: 'admin',
};

class AuthRepository {
  async login(credentials: AuthLoginData): Promise<{ user: AdminUser | null; token: string | null; error?: string }> {
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          return { user: null, token: null, error: error.message };
        }

        if (data.user && data.session) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email || credentials.email,
              role: 'admin',
            },
            token: data.session.access_token,
          };
        }
      } catch (err) {
        console.warn('Supabase auth failed, falling back to local verification:', err);
      }
    }

    // Local admin verification fallback (passwords accepted for demo: 'mumutech2026' or 'admin123')
    if (
      credentials.email === 'admin@mumutech.com' &&
      (credentials.password === 'mumutech2026' || credentials.password === 'admin123')
    ) {
      const mockToken = `mumu_token_${Buffer.from(credentials.email + ':' + Date.now()).toString('base64')}`;
      return {
        user: DEFAULT_ADMIN,
        token: mockToken,
      };
    }

    return {
      user: null,
      token: null,
      error: 'Credenciales inválidas. Usa admin@mumutech.com / mumutech2026 para el modo demo.',
    };
  }

  async verifyToken(token: string): Promise<AdminUser | null> {
    if (!token) return null;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          return {
            id: user.id,
            email: user.email || 'admin@mumutech.com',
            role: 'admin',
          };
        }
      } catch {
        // Fallback to local validation
      }
    }

    if (token.startsWith('mumu_token_')) {
      return DEFAULT_ADMIN;
    }

    return null;
  }
}

export const authRepository = new AuthRepository();
