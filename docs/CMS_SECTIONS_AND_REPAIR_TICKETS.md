# 🛠️ Integración de Textos de Secciones (CMS) y Sistema de Tickets de Reparación

Este documento detalla cómo funcionan actualmente en **modo simulado (en memoria)** tanto la edición de descripciones de secciones desde `/admin` como el sistema automático de tickets de reparación en `/servicios/[slug]`, y los pasos exactos para dejarlos **100% integrados en producción con Supabase y Resend**.

---

## 1. Edición Dinámica de Textos de Sección (`educativa`, `servicios`, `cosas-interesantes`)

### Cómo funciona ahora mismo
1. Los textos base iniciales viven en `INITIAL_SECTION_CONTENTS` (`src/repositories/seed.data.ts`), conservando exactamente los títulos y párrafos originales de cada sección.
2. Las páginas SSR `/educativa`, `/servicios` y `/cosas-interesantes` consultan `contentRepository.getSectionContent(category)` en cada solicitud.
3. En `/admin` → pestaña **TEXTOS SECCIONES**, el administrador puede editar el título y los párrafos (separados por una línea en blanco) de cada una de las tres secciones.
4. Al presionar **GUARDAR TEXTOS DE SECCIÓN**, el formulario envía `PUT /api/sections` (protegido con sesión firmada `HttpOnly` + validación Zod `SectionContentSchema`).
5. Si Supabase aún no está configurado con credenciales reales, `ContentRepository` actualiza el estado en memoria de inmediato (visible al instante al recargar `/educativa`, `/servicios` o `/cosas-interesantes`). Si Supabase está configurado, ejecuta `upsert` automático sobre la tabla `site_sections`.

### SQL para integrar `site_sections` en Supabase (Producción)
Ejecuta este script en el **SQL Editor** de tu proyecto en Supabase:

```sql
-- 1. Tabla de encabezados y descripciones por sección
create table if not exists public.site_sections (
  category text primary key check (category in ('educativa', 'servicios', 'cosas-interesantes')),
  title text not null,
  descriptions jsonb not null default '[]'::jsonb,
  "updatedAt" timestamptz not null default now()
);

-- 2. Activar Row Level Security (RLS)
alter table public.site_sections enable row level security;

-- Lectura pública para renderizar las páginas del sitio
create policy "Lectura pública de textos de sección"
  on public.site_sections
  for select
  to anon, authenticated
  using (true);

-- Escritura restringida a usuarios autenticados (o service_role desde el servidor Astro)
create policy "Edición de secciones solo para admin autenticado"
  on public.site_sections
  for all
  to authenticated
  using (true)
  with check (true);

-- 3. Semilla inicial con los textos actuales del sitio
insert into public.site_sections (category, title, descriptions)
values
  (
    'educativa',
    'TALLERES EDUCATIVOS',
    '["En esta sección encontrarás nuestros talleres prácticos donde construyes tus propios instrumentos y efectos de audio desde cero. No necesitas experiencia previa en electrónica ni ingeniería para comenzar: te enseñamos desde cómo tomar el cautín hasta cómo entender el flujo de la señal de audio.", "Todos los talleres incluyen los componentes electrónicos seleccionados (transistores vintage, potenciómetros Alpha, jacks Neutrik, gabinetes de aluminio perforados) y te llevas a casa tu pedal o sintetizador 100% funcional y terminado.", "Los cupos son reducidos (máximo 8 a 10 personas por sesión) para garantizar una atención personalizada en cada banco de trabajo."]'::jsonb
  ),
  (
    'servicios',
    'SERVICIOS TÉCNICOS & MODS',
    '["¿Tu pedal favorito mete ruido, mete zumbido o dejó de encender? ¿Quieres modificar la respuesta de tu distorsión clásica o adaptar un pedal vintage a 9V estándar? Ofrecemos diagnóstico transparente y reparación a nivel de componente.", "Trabajamos con componentes de alta fidelidad, estaño con plata para máxima conductividad y realizamos pruebas exhaustivas de señal en osciloscopio y amplificador antes de cada entrega.", "Aceptamos envíos desde todo el país y entregas directas en taller previa coordinación."]'::jsonb
  ),
  (
    'cosas-interesantes',
    'COSAS INTERESANTES & DIY',
    '["Aquí comparto esquemáticos, bitácoras de construcción y experimentos libres con artefactos electrónicos que no entran en las categorías tradicionales: desde generadores de feedback de video para monitores CRT hasta sintetizadores construidos con chips lógicos CMOS y grabadoras de cinta modificadas.", "La mayoría de estos proyectos son de código abierto / open hardware. Si construyes tu propia versión basándote en estas guías, etiquétanos o compártelo para seguir expandiendo la comunidad DIY de habla hispana.", "Próximamente también tendremos kits DIY listos para armar y artefactos únicos disponibles en nuestra tienda."]'::jsonb
  )
on conflict (category) do nothing;
```

---

## 2. Sistema de Tickets de Reparación (`/servicios/reparaciones-sistema-ticket`)

### Flujo implementado
1. El cliente ingresa a `/servicios/reparaciones-sistema-ticket` y completa:
   - `clientName` (Nombre cliente)
   - `clientEmail` (Mail cliente)
   - `equipmentBrandModel` (Marca y modelo del equipo)
   - `symptomsDescription` (Síntomas / descripción del problema)
2. El endpoint `POST /api/service-ticket`:
   - Aplica rate-limiting por IP, filtro honeypot anti-bots y validación estricta con `RepairTicketSchema`.
   - Genera un código único legible con formato `MTK-YYYYMMDD-XXXX` (`generateTicketNumber()` en `src/lib/repair-tickets.ts`).
   - Guarda el ticket en `contentRepository.saveRepairTicket(...)` (visible en `/admin` → pestaña **TICKETS**).
   - Dispara automáticamente dos correos mediante **Resend** (`dispatchRepairTicketEmails`):
     - **Al cliente**: Número de ticket, resumen del equipo/síntomas, valor base de diagnóstico (`$15.000 CLP` abonable a la reparación) y condiciones del proceso de cotización.
     - **Al administrador**: Ficha completa del caso con `reply_to` apuntando al correo del cliente para responder directamente con las coordenadas de recepción y el presupuesto final.

### SQL para integrar `repair_tickets` en Supabase (Producción)

```sql
create table if not exists public.repair_tickets (
  id text primary key,
  "ticketNumber" text not null unique,
  "serviceId" text not null,
  "serviceSlug" text not null,
  "serviceTitle" text not null,
  "clientName" text not null,
  "clientEmail" text not null,
  "equipmentBrandModel" text not null,
  "symptomsDescription" text not null,
  status text not null default 'recibido' check (status in ('recibido', 'en_diagnostico', 'cotizado', 'cerrado')),
  "diagnosticFeeSnapshot" integer,
  "createdAt" timestamptz not null default now()
);

alter table public.repair_tickets enable row level security;

-- Permitir inserción desde formulario público (o vía SUPABASE_SERVICE_ROLE_KEY en el backend)
create policy "Inserción pública de tickets de reparación"
  on public.repair_tickets
  for insert
  to anon, authenticated
  with check (true);

-- Lectura y actualización exclusiva para administradores autenticados
create policy "Lectura de tickets solo admin"
  on public.repair_tickets
  for select
  to authenticated
  using (true);
```

### Variables de Entorno en Netlify para activar el correo automático de Tickets (Resend)

Configura estas variables en **Netlify → Site configuration → Environment variables**:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL="Mumu Tech <servicio@tudominio.cl>"
RESEND_ADMIN_EMAIL="tu-correo-admin@tudominio.cl"
```

> Mientras `RESEND_API_KEY` no esté definida en desarrollo local, el ticket igualmente se genera con su código `MTK-...`, se muestra en pantalla al cliente y queda registrado en `/admin` → **TICKETS** sin producir errores.

