import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as supabaseLib from '../src/lib/supabase';
import { contentRepository } from '../src/repositories/content.repository';
import { authRepository } from '../src/repositories/auth.repository';
import { INITIAL_WORKSHOPS } from '../src/repositories/seed.data';
import { env } from '../src/lib/env';

describe('Supabase Client and Repository Online Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    supabaseLib.setSupabaseClient(null);
  });

  afterEach(() => {
    supabaseLib.setSupabaseClient(null);
  });

  it('should verify Supabase configured status', () => {
    expect(typeof supabaseLib.isSupabaseConfigured()).toBe('boolean');
  });

  it('should set and get custom Supabase client', () => {
    const mockClient = { auth: {} } as any;
    supabaseLib.setSupabaseClient(mockClient);
    expect(supabaseLib.getSupabaseClient()).toBe(mockClient);
  });

  it('should return null if supabase is not configured', () => {
    env.PUBLIC_SUPABASE_URL = 'https://mock-supabase.local';
    env.PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
    expect(supabaseLib.getSupabaseClient()).toBeNull();
  });

  it('should instantiate createClient when valid credentials exist', () => {
    env.PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
    env.PUBLIC_SUPABASE_ANON_KEY = 'valid-real-anon-key';
    const client = supabaseLib.getSupabaseClient();
    expect(client).not.toBeNull();
    // restore
    env.PUBLIC_SUPABASE_URL = 'https://mock-supabase.local';
    env.PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
  });

  describe('ContentRepository with Mocked Supabase Client', () => {
    it('should fetch items from Supabase when available', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [INITIAL_WORKSHOPS[0]],
              error: null,
            }),
          }),
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const items = await contentRepository.getAllItems();
      expect(items.length).toBe(1);
      expect(items[0].code).toBe('001');
    });

    it('should fallback to in-memory items if Supabase returns query error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database down'),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const items = await contentRepository.getAllItems();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should call supabase upsert when saving item', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: upsertMock,
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      await contentRepository.saveItem(INITIAL_WORKSHOPS[0]);
      expect(upsertMock).toHaveBeenCalledWith(INITIAL_WORKSHOPS[0]);
    });

    it('should handle supabase upsert error gracefully', async () => {
      const upsertMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: upsertMock,
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const saved = await contentRepository.saveItem(INITIAL_WORKSHOPS[0]);
      expect(saved.id).toBe(INITIAL_WORKSHOPS[0].id);
    });

    it('should call supabase delete when deleting item', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: deleteMock,
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      await contentRepository.deleteItem(INITIAL_WORKSHOPS[0].id);
      expect(eqMock).toHaveBeenCalledWith('id', INITIAL_WORKSHOPS[0].id);
    });

    it('should handle supabase delete error gracefully', async () => {
      const eqMock = vi.fn().mockRejectedValue(new Error('Delete error'));
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: deleteMock,
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const res = await contentRepository.deleteItem(INITIAL_WORKSHOPS[1].id);
      expect(typeof res).toBe('boolean');
    });

    it('should save and fetch contact messages via Supabase', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const orderMock = vi.fn().mockResolvedValue({
        data: [{ id: 'msg-1', name: 'Slash', email: 'slash@gnr.com', interest: 'taller', message: 'Hola', subscribeNewsletter: true, createdAt: '', read: false }],
        error: null,
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contact_messages') {
            return {
              insert: insertMock,
              select: vi.fn().mockReturnValue({ order: orderMock }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      await contentRepository.saveContactMessage({
        name: 'Slash',
        email: 'slash@gnr.com',
        interest: 'taller',
        message: 'Hola',
        subscribeNewsletter: true,
      });
      expect(insertMock).toHaveBeenCalled();

      const messages = await contentRepository.getContactMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].name).toBe('Slash');
    });

    it('should handle supabase message fetch error gracefully', async () => {
      const orderMock = vi.fn().mockRejectedValue(new Error('Query failed'));
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ order: orderMock }),
        }),
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const messages = await contentRepository.getContactMessages();
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('AuthRepository with Mocked Supabase Auth', () => {
    it('should authenticate user via Supabase Auth when available', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'sb-usr-1', email: 'sb@mumutech.com' },
              session: { access_token: 'sb_jwt_token_123' },
            },
            error: null,
          }),
        },
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const result = await authRepository.login({
        email: 'sb@mumutech.com',
        password: 'validpassword123',
      });

      expect(result.user?.id).toBe('sb-usr-1');
      expect(result.token).toBe('sb_jwt_token_123');
    });

    it('should return error when Supabase Auth returns error', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid Supabase Login' },
          }),
        },
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const result = await authRepository.login({
        email: 'bad@mumutech.com',
        password: 'badpassword',
      });

      expect(result.error).toBe('Invalid Supabase Login');
    });

    it('should verify Supabase user token', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'usr-99', email: 'online@mumutech.com' } },
            error: null,
          }),
        },
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const user = await authRepository.verifyToken('sb_valid_token');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('online@mumutech.com');
    });

    it('should fallback to local validation if Supabase getUser throws', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error('Supabase Auth error')),
        },
      };

      vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClient(mockSupabase as any);

      const user = await authRepository.verifyToken('mumu_token_fallback');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('admin@mumutech.com');
    });
  });
});
