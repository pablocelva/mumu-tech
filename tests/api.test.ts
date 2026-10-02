import { describe, it, expect, beforeEach } from 'vitest';
import { POST as contactHandler } from '../src/pages/api/contact';
import { POST as authHandler } from '../src/pages/api/auth';
import { GET as contentGetHandler, POST as contentPostHandler, DELETE as contentDeleteHandler } from '../src/pages/api/content';
import { contentRepository } from '../src/repositories/content.repository';

describe('API Route Handlers Integration Tests', () => {
  beforeEach(() => {
    contentRepository.resetToSeed();
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

      // @ts-ignore
      const response = await contactHandler({ request } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('David Gilmour');
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

      // @ts-ignore
      const response = await contactHandler({ request } as any);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe('POST /api/auth', () => {
    it('should authenticate valid credentials and return token', async () => {
      const request = new Request('http://localhost/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mumutech.com',
          password: 'mumutech2026',
        }),
      });

      // @ts-ignore
      const response = await authHandler({ request } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.token).toBeDefined();
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

      // @ts-ignore
      const response = await authHandler({ request } as any);
      expect(response.status).toBe(401);
    });
  });

  describe('GET & POST & DELETE /api/content', () => {
    it('should retrieve items list or filtered by category', async () => {
      const url = new URL('http://localhost/api/content?category=educativa');
      // @ts-ignore
      const response = await contentGetHandler({ url } as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('should block unauthorized POST requests', async () => {
      const request = new Request('http://localhost/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // @ts-ignore
      const response = await contentPostHandler({ request } as any);
      expect(response.status).toBe(401);
    });

    it('should allow authorized POST and DELETE requests with valid token', async () => {
      const validToken = `mumu_token_${Buffer.from('admin@mumutech.com:123').toString('base64')}`;

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
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify(newItem),
      });

      // @ts-ignore
      const postResponse = await contentPostHandler({ request: postRequest } as any);
      expect(postResponse.status).toBe(201);

      // Now delete it
      const deleteUrl = new URL('http://localhost/api/content?id=api-item-01');
      const deleteRequest = new Request('http://localhost/api/content?id=api-item-01', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      // @ts-ignore
      const deleteResponse = await contentDeleteHandler({ request: deleteRequest, url: deleteUrl } as any);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
