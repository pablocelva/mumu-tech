import { z } from 'zod';

export const CategoryEnum = z.enum(['educativa', 'servicios', 'cosas-interesantes']);

const SAFE_LOCAL_IMAGE_PATH = /^\/images\/[a-zA-Z0-9._/-]+$/;

export const SafeImageUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => SAFE_LOCAL_IMAGE_PATH.test(val) || z.httpUrl().safeParse(val).success,
    'Debe ser una URL http/https válida o una ruta local segura (/images/...)'
  );

export const OptionalHttpUrlSchema = z
  .httpUrl('Debe ser una URL http/https válida')
  .optional()
  .or(z.literal(''));

export const BaseItemSchema = z.object({
  id: z.string().min(1, 'El ID es requerido').max(100),
  code: z.string().regex(/^\d{3}$/, 'El código debe tener 3 dígitos (ej: 001)'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(180),
  slug: z.string().min(2, 'El slug es requerido').max(180),
  summary: z.string().min(10, 'El resumen debe tener al menos 10 caracteres').max(500),
  description: z.string().min(20, 'La descripción detallada debe tener al menos 20 caracteres').max(5000),
  category: CategoryEnum,
  imageUrl: SafeImageUrlSchema,
  imageAlt: z.string().min(3, 'El texto alternativo es requerido').max(250),
  tags: z.array(z.string().max(50)).max(20).default([]),
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
  estimatedTurnaround: z.string().max(120).optional(),
  serviceType: z.enum(['Reparación', 'Modificación', 'Calibración', 'Custom Build']).optional(),
  startingPrice: z.number().nonnegative().optional(),
});

export const ProjectSchema = BaseItemSchema.extend({
  category: z.literal('cosas-interesantes'),
  projectType: z.enum(['Video Synth', 'Audio Hack', 'Pedal DIY', 'Experimento']).optional(),
  schematicUrl: OptionalHttpUrlSchema,
  demoVideoUrl: OptionalHttpUrlSchema,
});

export const ContentItemSchema = z.discriminatedUnion('category', [
  WorkshopSchema,
  ServiceSchema,
  ProjectSchema,
]);

export const ContactFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado extenso'),
  email: z.string().trim().email('Ingresa un correo electrónico válido').max(254),
  phone: z.string().regex(/^[+0-9\s-]{7,20}$/, 'Teléfono inválido').optional().or(z.literal('')),
  interest: z.enum(['taller', 'servicio', 'proyecto', 'newsletter', 'otro']),
  message: z.string().trim().min(10, 'El mensaje debe tener al menos 10 caracteres').max(4000, 'Mensaje demasiado extenso'),
  subscribeNewsletter: z.boolean().default(false),
  website: z.string().optional().default(''),
});

export const NewsletterSubscribeSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido').max(254),
  website: z.string().optional().default(''),
});

export const AuthLoginSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido').max(254),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(256),
});

export const EnvSchema = z.object({
  PUBLIC_SUPABASE_URL: z.httpUrl().optional().default('https://mock-supabase.local'),
  PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default('mumu-tech'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_ALLOWED_EMAILS: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional().default('dev-secret-key-12345'),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;
export type AuthLoginData = z.infer<typeof AuthLoginSchema>;
export type ContentItemInput = z.infer<typeof ContentItemSchema>;
