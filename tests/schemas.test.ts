import { describe, it, expect } from 'vitest';
import {
  BaseItemSchema,
  WorkshopSchema,
  ServiceSchema,
  ProjectSchema,
  ContentItemSchema,
  ContactFormSchema,
  AuthLoginSchema,
  NewsletterSubscribeSchema,
  EnvSchema,
} from '../src/schemas';

describe('Zod Schemas Validation Suite', () => {
  describe('WorkshopSchema', () => {
    it('should validate a correct workshop item', () => {
      const validWorkshop = {
        id: 'ws-test',
        code: '101',
        title: 'Taller Pedal Fuzz',
        slug: 'taller-pedal-fuzz',
        summary: 'Aprende a soldar y armar tu propio pedal fuzz.',
        description: 'Taller completo de 6 horas donde aprenderás todos los secretos de la electrónica analógica.',
        category: 'educativa',
        imageUrl: 'https://images.unsplash.com/photo-1598488035139',
        imageAlt: 'Pedal fuzz abierto',
        tags: ['Fuzz', 'DIY'],
        featured: true,
        published: true,
        durationHours: 6,
        level: 'Principiante',
        materialsIncluded: true,
        spotsLimit: 8,
        price: 65000,
      };

      const result = WorkshopSchema.safeParse(validWorkshop);
      expect(result.success).toBe(true);
    });

    it('should fail when code is not 3 digits', () => {
      const invalidWorkshop = {
        id: 'ws-test',
        code: '12',
        title: 'Taller Test',
        slug: 'taller-test',
        summary: 'Resumen de prueba valido.',
        description: 'Descripcion detallada de prueba con suficiente longitud.',
        category: 'educativa',
        imageUrl: 'https://images.unsplash.com/photo',
        imageAlt: 'Foto',
      };

      const result = WorkshopSchema.safeParse(invalidWorkshop);
      expect(result.success).toBe(false);
    });
  });

  describe('ServiceSchema & ProjectSchema', () => {
    it('should validate a correct service item', () => {
      const validService = {
        id: 'srv-test',
        code: '202',
        title: 'Reparación de Amplificadores',
        slug: 'reparacion-amplificadores',
        summary: 'Mantenimiento y revalvulaje de amplificadores a tubos.',
        description: 'Chequeo de bias, cambio de condensadores y limpieza exhaustiva de potenciómetros.',
        category: 'servicios',
        imageUrl: 'https://images.unsplash.com/photo-amp',
        imageAlt: 'Amplificador',
        serviceType: 'Reparación',
        startingPrice: 35000,
      };

      const result = ServiceSchema.safeParse(validService);
      expect(result.success).toBe(true);
    });

    it('should validate a correct project item with schematic URL', () => {
      const validProject = {
        id: 'prj-test',
        code: '303',
        title: 'Video Synth Feedback Generator',
        slug: 'video-synth-feedback',
        summary: 'Generador analógico de texturas de video glitch.',
        description: 'Circuito DIY basado en escalador de video con inyección de audio para ondas CRT.',
        category: 'cosas-interesantes',
        imageUrl: 'https://images.unsplash.com/photo-video',
        imageAlt: 'Video CRT',
        projectType: 'Video Synth',
        schematicUrl: 'https://github.com/mumutech/schematic',
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });
  });

  describe('ContactFormSchema & NewsletterSubscribeSchema', () => {
    it('should validate a valid contact form submission', () => {
      const validForm = {
        name: 'Carlos Santana',
        email: 'carlos@santana.com',
        phone: '+56912345678',
        interest: 'taller',
        message: 'Hola! Quiero reservar un cupo para el taller de pedales Fuzz.',
        subscribeNewsletter: true,
      };

      const result = ContactFormSchema.safeParse(validForm);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in contact form', () => {
      const invalidForm = {
        name: 'Carlos',
        email: 'invalid-email',
        interest: 'taller',
        message: 'Mensaje de prueba con longitud suficiente.',
        subscribeNewsletter: false,
      };

      const result = ContactFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
    });

    it('should validate newsletter subscription email', () => {
      expect(NewsletterSubscribeSchema.safeParse({ email: 'fan@audio.com' }).success).toBe(true);
      expect(NewsletterSubscribeSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });
  });

  describe('AuthLoginSchema & EnvSchema', () => {
    it('should validate auth login credentials', () => {
      const validAuth = {
        email: 'admin@mumutech.com',
        password: 'mumutech2026',
      };
      expect(AuthLoginSchema.safeParse(validAuth).success).toBe(true);

      const invalidAuth = {
        email: 'admin@mumutech.com',
        password: '123',
      };
      expect(AuthLoginSchema.safeParse(invalidAuth).success).toBe(false);
    });

    it('should provide default values for EnvSchema when minimal props provided', () => {
      const parsedEnv = EnvSchema.parse({});
      expect(parsedEnv.PUBLIC_SUPABASE_URL).toBe('https://mock-supabase.local');
      expect(parsedEnv.PUBLIC_CLOUDINARY_CLOUD_NAME).toBe('mumu-tech');
    });
  });
});
