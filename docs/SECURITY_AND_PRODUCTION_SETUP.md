# Guía de Seguridad en Producción (Supabase RLS, Cloudinary, Resend & Netlify)

Este documento detalla la configuración de seguridad para pasar **Mumu Tech** a producción con **Supabase**, **Cloudinary**, **Resend** y **Netlify**, complementando las defensas ya implementadas en el código fuente.

---

## 1. Resumen de Defensas Activas en el Código

1. **Parches Octubre 2026 aplicados:**
   - **Node.js `>=24.22.2`** en `netlify.toml` y `package.json` (mitigación de `CVE-2026-111497` / *Node2Shell* y fixes TLS/DNS).
   - **Vite `8.3.5`** y **Astro `7.4.5`** (mitigación de `CVE-2026-112946/47`, `CVE-2026-118662` y `CVE-2026-114127/28`).
   - **`netlify({ imageCDN: false })`** en `astro.config.mjs` (cierre de superficie SSRF en `/.netlify/images`).
2. **Protección SSR Real en `/admin`:**
   - Sesión basada en cookie **`HttpOnly; SameSite=Strict; Secure`** (`mumu_admin_session`) con `Cache-Control: no-store, private`.
   - `<AdminDashboard />` solo se ejecuta y renderiza en el servidor cuando la sesión es válida; un visitante no autenticado jamás recibe HTML ni datos del panel.
3. **Bloqueo de Credenciales Demo en Producción:**
   - El fallback de desarrollo (`admin@mumutech.com`) está aislado estrictamente a `import.meta.env.DEV` con firma HMAC-SHA256 (`src/lib/security.ts`). En producción (`astro build`) se exige Supabase Auth real y se rechaza cualquier token que no provenga de Supabase.
4. **Validación Estricta y Anti-Bot:**
   - Esquemas Zod con `z.httpUrl()` para bloquear vectores XSS por protocolo `javascript:` o `data:`.
   - Campo **Honeypot** (`website`) y **Rate Limiting por IP** (`x-nf-client-connection-ip`) tanto en `/api/contact` como en `/api/auth`.
5. **Cabeceras HTTP de Seguridad en `netlify.toml`:**
   - `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Permissions-Policy`.

---

## 2. Script SQL de Tablas y Políticas RLS para Supabase

Ejecuta este script en el **SQL Editor** de tu proyecto en Supabase para crear las tablas y blindar el acceso con **Row Level Security (RLS)**.

> **Importante:** Reemplaza `'admin-real@tudominio.com'` en las políticas por el correo real del administrador registrado en **Supabase Authentication → Users** (y desactiva *Allow new users to sign up* en *Authentication → Providers → Email* para que nadie externo pueda registrarse).

```sql
-- ============================================================================
-- 1. TABLA DE CONTENIDO DEL SITIO (Talleres, Servicios, Proyectos DIY)
-- ============================================================================
create table if not exists public.content_items (
  id text primary key,
  code text not null,
  title text not null,
  slug text not null unique,
  summary text not null,
  description text not null,
  category text not null check (category in ('educativa', 'servicios', 'cosas-interesantes')),
  "imageUrl" text not null,
  "imageAlt" text not null,
  tags jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published boolean not null default true,
  "durationHours" numeric,
  level text,
  "materialsIncluded" boolean,
  "spotsLimit" integer,
  price numeric,
  "estimatedTurnaround" text,
  "serviceType" text,
  "startingPrice" numeric,
  "projectType" text,
  "schematicUrl" text,
  "demoVideoUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.content_items enable row level security;

-- Lectura pública: SOLO elementos publicados (published = true)
create policy "Public can read published items"
  on public.content_items
  for select
  to anon
  using (published = true);

-- Administrador autenticado: control total (lectura de borradores, creación, edición y borrado)
create policy "Admin full access on content_items"
  on public.content_items
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin-real@tudominio.com')
  with check ((auth.jwt() ->> 'email') = 'admin-real@tudominio.com');


-- ============================================================================
-- 2. TABLA DE MENSAJES DE CONTACTO Y SUSCRIPTORES
-- ============================================================================
create table if not exists public.contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  interest text not null check (interest in ('taller', 'servicio', 'proyecto', 'newsletter', 'otro')),
  message text not null,
  "subscribeNewsletter" boolean not null default false,
  read boolean not null default false,
  "createdAt" timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Inserción pública desde el formulario de contacto (sin permiso de lectura para anon)
create policy "Public can insert contact messages"
  on public.contact_messages
  for insert
  to anon
  with check (true);

-- Lectura, actualización y borrado EXCLUSIVOS para el administrador autenticado
create policy "Admin can manage contact messages"
  on public.contact_messages
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'admin-real@tudominio.com')
  with check ((auth.jwt() ->> 'email') = 'admin-real@tudominio.com');
```

---

## 3. Configuración Segura de Cloudinary (Subida de Imágenes)

1. **Nunca uses Unsigned Presets abiertos:** En *Settings → Upload*, mantén los presets de subida en modo **Signed**.
2. **Restricción de formatos y peso:**
   - Permite únicamente formatos de imagen seguros: `jpg`, `jpeg`, `png`, `webp`, `avif`.
   - **No permitas subida de `.svg` ni `.pdf`/`.html` desde formularios** (previene Stored XSS).
   - Limita el tamaño máximo de archivo a `5 MB`.
3. **Firma en el Servidor:** Cuando agregues el selector de archivos al dashboard `/admin`, genera la firma en un endpoint privado de Astro (`/api/admin/cloudinary-sign`) verificando primero `extractSessionToken(request)` + `authRepository.verifyToken(token)` y firmando el timestamp con `createHash('sha1')` o el SDK de Cloudinary usando `CLOUDINARY_API_SECRET` (variable sin prefijo `PUBLIC_`).
4. **Strict Transformations (Opcional recomendado):** En *Settings → Security*, habilita *Strict Transformations* o firma de URLs si deseas evitar que terceros generen redimensionados arbitrarios consumiendo tus créditos mensuales.

---

## 4. Configuración Segura de Resend (Correos Transaccionales)

1. **Autenticación de Dominio (Anti-Spoofing):**
   - En el panel de Resend agrega el dominio (ej. `notificaciones.mumutech.com` o `mumutech.com`) y configura los registros DNS **SPF**, **DKIM** y **DMARC** (`v=DMARC1; p=quarantine;`).
2. **Sanitización Obligatoria al Construir HTML:**
   - Usa siempre los helpers incluidos en `src/lib/security.ts` (`escapeHtml` y `sanitizeEmailHeader`) al interpolar datos del formulario en correos:

```typescript
import { escapeHtml, sanitizeEmailHeader } from '../../lib/security';

const safeSubject = sanitizeEmailHeader(`[Mumu Tech] Consulta de ${validated.data.name}`);
const safeName = escapeHtml(validated.data.name);
const safeEmail = escapeHtml(validated.data.email);
const safePhone = escapeHtml(validated.data.phone || 'No indicado');
const safeMessage = escapeHtml(validated.data.message);
```

---

## 5. Checklist de Variables de Entorno en Netlify

En **Netlify → Site configuration → Environment variables**, define (marcando como *Secret* todas las que no llevan `PUBLIC_`):

| Variable | Visibilidad | Propósito |
| :--- | :--- | :--- |
| `PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Pública | Clave anónima sujeta a políticas RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta (Servidor)** | Solo si requieres operaciones administrativas bypass RLS en backend |
| `ADMIN_ALLOWED_EMAILS` | **Secreta (Servidor)** | Lista separada por comas de emails autorizados en `/admin` (ej. `cliente@mumutech.com,tu@correo.com`) |
| `ADMIN_SESSION_SECRET` | **Secreta (Servidor)** | Cadena aleatoria de 32+ caracteres (`openssl rand -hex 32`) |
| `PUBLIC_CLOUDINARY_CLOUD_NAME` | Pública | Nombre del cloud en Cloudinary para URLs optimizadas |
| `CLOUDINARY_API_KEY` | **Secreta (Servidor)** | API Key para subidas firmadas |
| `CLOUDINARY_API_SECRET` | **Secreta (Servidor)** | Secreto para firmar subidas en backend |
| `RESEND_API_KEY` | **Secreta (Servidor)** | API Key de Resend para envío de correos en `/api/contact` |

> Verifica además en **Netlify → Site configuration → Functions** que el runtime de funciones serverless esté configurado en **Node.js 24.x**.

