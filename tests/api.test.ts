import { describe, it, expect, beforeEach } from 'vitest';
import { POST as contactHandler } from '../src/pages/api/contact';
import { POST as authHandler, DELETE as authLogoutHandler } from '../src/pages/api/auth';
import { GET as contentGetHandler, POST as contentPostHandler, DELETE as contentDeleteHandler } from '../src/pages/api/content';
import { contentRepository } from '../src/repositories/content.repository';
import { authRepository } from '../src/repositories/auth.repository';
import { ADMIN_COOKIE_NAME, authRateLimiter, contactRateLimiter } from '../src/lib/security';

describe('API Route Handlers Integration Tests', () => {
  beforeEach(() => {
    contentRepository.resetToSeed();
    contactRateLimiter.reset();
    authRateLimiter.reset();
  });

  describe('POST /api/contact', () => {
    it('should successfully process a valid contact submission', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'David Gilmour',
          email: 'david@pinkfloyd.com',
          interest: 'taller',
          message: 'Quiero armar el pedal fuzz para probar solos de guitarra.',
          subscribeNewsletter: true,
        }),
      });

      const response = await contactHandler({ request } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('David Gilmour');
    });

    it('should successfully process a direct newsletter subscription with email only', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'synthlover@analog.com',
        }),
      });

      const response = await contactHandler({ request } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.email).toBe('synthlover@analog.com');
      expect(json.data.interest).toBe('newsletter');
    });

    it('should silently trap bots that fill the hidden honeypot field without storing spam', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'SpamBot',
          email: 'bot@spam.com',
          interest: 'otro',
          message: 'Buy cheap crypto links right now!',
          website: 'https://evil-spam.example',
        }),
      });

      const response = await contactHandler({ request } as any);
      expect(response.status).toBe(200);
      const messages = await contentRepository.getContactMessages();
      expect(messages.length).toBe(0);
    });

    it('should return 429 Too Many Requests when IP exceeds contact rate limit', async () => {
      for (let i = 0; i < 5; i++) {
        const req = new Request('http://localhost/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nf-client-connection-ip': '198.51.100.77',
          },
          body: JSON.stringify({ email: `user${i}@analog.com` }),
        });
        const res = await contactHandler({ request: req } as any);
        expect(res.status).toBe(200);
      }

      const blockedReq = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '198.51.100.77',
        },
        body: JSON.stringify({ email: 'overflow@analog.com' }),
      });
      const blockedRes = await contactHandler({ request: blockedReq } as any);
      expect(blockedRes.status).toBe(429);
    });

    it('should reject invalid payload with status 400', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'D',
          email: 'invalid-email',
          message: 'short',
        }),
      });

      const response = await contactHandler({ request } as any);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe('POST & DELETE /api/auth', () => {
    it('should authenticate valid credentials, return token, and set HttpOnly cookie', async () => {
      const request = new Request('http://localhost/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mumutech.com',
          password: 'mumutech2026',
        }),
      });

      const response = await authHandler({ request } as any);
      const json = await response.json();
      const setCookie = response.headers.get('Set-Cookie') || '';

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.token).toBeDefined();
      expect(setCookie).toContain(`${ADMIN_COOKIE_NAME}=`);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
    });

    it('should clear session cookie on DELETE /api/auth', async () => {
      const response = await authLogoutHandler({} as any);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    });

    it('should return 401 for wrong credentials', async () => {
      const request = new Request('http://localhost/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mumutech.com',
          password: 'wrongpassword',
        }),
      });

      const response = await authHandler({ request } as any);
      expect(response.status).toBe(401);
    });
  });

  describe('GET & POST & DELETE /api/content', () => {
    it('should retrieve items list or filtered by category', async () => {
      const url = new URL('http://localhost/api/content?category=educativa');
      const response = await contentGetHandler({ url } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('should block unauthorized POST requests and forged legacy tokens', async () => {
      const request = new Request('http://localhost/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mumu_token_forged',
        },
        body: JSON.stringify({}),
      });

      const response = await contentPostHandler({ request } as any);
      expect(response.status).toBe(401);
    });

    it('should allow authorized POST and DELETE requests via signed cookie or Bearer token', async () => {
      const login = await authRepository.login({
        email: 'admin@mumutech.com',
        password: 'mumutech2026',
      });
      const validToken = login.token!;

      const newItem = {
        id: 'api-item-01',
        code: '555',
        title: 'Taller de Osciladores DIY',
        slug: 'taller-osciladores-diy',
        summary: 'Taller experimental de osciladores analógicos.',
        description: 'Construcción paso a paso de osciladores sonoros y filtros activos.',
        category: 'educativa',
        imageUrl: 'https://images.unsplash.com/photo-osc',
        imageAlt: 'Oscilador',
        tags: ['Audio', 'LFO'],
        featured: true,
        published: true,
        price: 50000,
      };

      const postRequest = new Request('http://localhost/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(validToken)}`,
        },
        body: JSON.stringify(newItem),
      });

      const postResponse = await contentPostHandler({ request: postRequest } as any);
      expect(postResponse.status).toBe(201);

      // Now delete it
      const deleteUrl = new URL('http://localhost/api/content?id=api-item-01');
      const deleteRequest = new Request('http://localhost/api/content?id=api-item-01', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const deleteResponse = await contentDeleteHandler({ request: deleteRequest, url: deleteUrl } as any);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
