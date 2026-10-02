import { z } from 'zod';

export const CategoryEnum = z.enum(['educativa', 'servicios', 'cosas-interesantes']);

export const BaseItemSchema = z.object({
  id: z.string().min(1, 'El ID es requerido'),
  code: z.string().regex(/^\d{3}$/, 'El código debe tener 3 dígitos (ej: 001)'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  slug: z.string().min(2, 'El slug es requerido'),
  summary: z.string().min(10, 'El resumen debe tener al menos 10 caracteres'),
  description: z.string().min(20, 'La descripción detallada debe tener al menos 20 caracteres'),
  category: CategoryEnum,
  imageUrl: z.string().url('Debe ser una URL válida'),
  imageAlt: z.string().min(3, 'El texto alternativo es requerido'),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const WorkshopSchema = BaseItemSchema.extend({
  category: z.literal('educativa'),
  durationHours: z.number().positive().optional(),
  level: z.enum(['Principiante', 'Intermedio', 'Avanzado']).optional(),
  materialsIncluded: z.boolean().optional(),
  spotsLimit: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
});

export const ServiceSchema = BaseItemSchema.extend({
  category: z.literal('servicios'),
  estimatedTurnaround: z.string().optional(),
  serviceType: z.enum(['Reparación', 'Modificación', 'Calibración', 'Custom Build']).optional(),
  startingPrice: z.number().nonnegative().optional(),
});

export const ProjectSchema = BaseItemSchema.extend({
  category: z.literal('cosas-interesantes'),
  projectType: z.enum(['Video Synth', 'Audio Hack', 'Pedal DIY', 'Experimento']).optional(),
  schematicUrl: z.string().url().optional().or(z.literal('')),
  demoVideoUrl: z.string().url().optional().or(z.literal('')),
});

export const ContentItemSchema = z.discriminatedUnion('category', [
  WorkshopSchema,
  ServiceSchema,
  ProjectSchema,
]);

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  phone: z.string().regex(/^[+0-9\s-]{7,20}$/, 'Teléfono inválido').optional().or(z.literal('')),
  interest: z.enum(['taller', 'servicio', 'proyecto', 'newsletter', 'otro']),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
  subscribeNewsletter: z.boolean().default(false),
});

export const NewsletterSubscribeSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
});

export const AuthLoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const EnvSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url().optional().default('https://mock-supabase.local'),
  PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default('mumu-tech'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional().default('dev-secret-key-12345'),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;
export type AuthLoginData = z.infer<typeof AuthLoginSchema>;
export type ContentItemInput = z.infer<typeof ContentItemSchema>;
