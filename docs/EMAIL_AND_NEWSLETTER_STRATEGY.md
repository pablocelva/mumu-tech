# 📨 Estrategia de Correo Electrónico & Newsletter — Mumu Tech

Esta guía documenta las decisiones técnicas, comparativas de servicios y la estrategia de diseño de correo para **Mumu Tech**, abarcando tanto los **correos transaccionales** (notificaciones de contacto y confirmaciones) como las **campañas de email marketing** (newsletters y avisos de talleres).

---

## 📑 Índice
1. [Comparativa: Resend vs. Formspree](#1-comparativa-resend-vs-formspree)
2. [Servicios Recomendados para Newsletter (Capas Gratuitas)](#2-servicios-recomendados-para-newsletter-capas-gratuitas)
3. [Estrategia de UI & Branding para Correos](#3-estrategia-de-ui--branding-para-correos)
4. [Arquitectura de Implementación en Astro](#4-arquitectura-de-implementación-en-astro)
5. [Guía Práctica para el Cliente](#5-guía-práctica-para-el-cliente)

---

## 1. Comparativa: Resend vs. Formspree

Para el procesamiento de los formularios del sitio web (`/contacto` y el bloque rápido de Newsletter):

| Característica | Formspree (Plan Gratuito) | Resend (Plan Gratuito) |
| :--- | :--- | :--- |
| **Límite de envíos** | **50 envíos al mes** | **3.000 correos al mes** (100 diarios) |
| **Dominio Personalizado** | No disponible (sale de servidores compartidos) | **Sí** (envío desde `contacto@mumutech.com` con SPF/DKIM) |
| **Control de Diseño & HTML** | Básico o redirección forzada a su web | **100% controlable** (HTML nativo o React Email) |
| **Validación Backend** | Limitada a sus servidores | Validación estricta en Astro con **Zod** y **Clean Code** |
| **Persistencia de Datos** | Almacenamiento en panel externo | Guardado directo en **Supabase** + reenvío instantáneo |
| **Autorespuesta al Usuario** | No incluida en free | **Sí** (confirmación inmediata con branding) |

### 💡 Conclusión Técnica
**Resend es la opción recomendada** para la infraestructura de Mumu Tech por su generosa capa gratuita, integración directa mediante SDK en el endpoint `src/pages/api/contact.ts`, y capacidad de enviar correos con HTML/CSS a medida sin marcas de agua.

---

## 2. Servicios Recomendados para Newsletter (Capas Gratuitas)

Para que el cliente envíe boletines masivos (nuevos cupos para armar pedales Fuzz, novedades de proyectos y demos de sintetizadores) sin necesidad de programar:

### A. Brevo (anteriormente Sendinblue) — *Opción #1 Recomendada*
* **Límite Gratuito:** **Contactos ilimitados** y hasta **300 correos por día** (9.000 correos/mes).
* **Editor:** Editor visual *drag-and-drop* intuitivo para usuarios no técnicos.
* **Integración:** API REST y webhooks listos para conectar con el formulario de la web.
* **Idioma:** Plataforma y soporte en español.

### B. MailerLite
* **Límite Gratuito:** Hasta **1.000 suscriptores** y **12.000 correos al mes**.
* **Editor:** Muy limpio, moderno y enfocado en estética visual y creadores de contenido.
* **Automatización:** Secuencias automáticas de bienvenida para nuevos inscritos.

### C. Buttondown
* **Límite Gratuito:** Hasta **1.000 suscriptores**.
* **Estilo:** Minimalista basado en Markdown, ideal para proyectos *indie/maker* y boletines de ingeniería o audio analógico.

---

## 3. Estrategia de UI & Branding para Correos

Para mantener la coherencia con la identidad **Lo-Fi Future / Analog Synth** del sitio web:

### Paleta de Colores de Email
```css
--bg-main:       #0d0d15; /* Fondo principal del correo */
--bg-card:       #161622; /* Fondo de contenedor y tarjetas */
--accent-cyan:   #00f0ff; /* Botones principales y bordes */
--accent-pink:   #ff2a85; /* Badges y destacados */
--accent-lime:   #39ff14; /* Confirmaciones y estado activo */
--text-primary:  #f2f2f8; /* Texto principal */
--text-muted:    #a6a6b8; /* Textos secundarios y descripciones */
--border-subtle: #2a2a3c; /* Líneas divisorias */
```

### Tipografía y Estructura
1. **Header**: Logotipo de `MUMU TECH` centrado sobre fondo oscuro con acento degradado.
2. **Badge de Sección**: Bloque con tipografía monospace `[ TALLERES & CONVOCATORIA ]` o `[ NUEVO PROYECTO DIY ]`.
3. **Cuerpo del Mensaje**: Tipografía sans-serif limpia (`Arial, Helvetica, sans-serif`) con interlineado generoso (1.6) para asegurar compatibilidad en Gmail, Outlook y Apple Mail.
4. **Llamadas a la Acción (CTAs)**: Botones rectangulares con bordes rectos (2px de radio), fondo contrastante y texto en mayúsculas (`RESERVAR CUPO`, `VER DEMO EN VIDEO`).
5. **Footer**: Enlaces directos a WhatsApp, Instagram y enlace obligatorio de desuscripción de 1 clic (para cumplir con normativas anti-spam).

---

## 4. Arquitectura de Implementación en Astro

### Flujo de Correos Transaccionales (Vía Resend):
```text
[Usuario en la Web]
       │
       ▼ (POST /api/contact)
[Astro Endpoint + Zod Validation]
       ├──► 1. Guarda registro en Supabase (tabla contact_messages / newsletter_subscribers)
       └──► 2. Dispara Resend API
                ├──► Correo al Administrador: "Nuevo mensaje de contacto / Solicitud de taller"
                └──► Correo al Usuario: "¡Gracias por contactar a Mumu Tech! (Confirmación con branding)"
```

### Código de Ejemplo para `src/pages/api/contact.ts` con Resend:
```typescript
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Envío al administrador
await resend.emails.send({
  from: 'Mumu Tech <notificaciones@mumutech.com>',
  to: ['admin@mumutech.com'],
  subject: `[Mumu Tech] Nueva consulta: ${data.name} (${data.interest})`,
  html: `
    <div style="background-color: #0d0d15; color: #f2f2f8; padding: 24px; font-family: monospace;">
      <h2 style="color: #00f0ff; margin-top: 0;">[ NUEVA CONSULTA RECIBIDA ]</h2>
      <p><strong>Nombre:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Teléfono:</strong> ${data.phone || 'No especificado'}</p>
      <p><strong>Interés:</strong> ${data.interest}</p>
      <div style="background: #161622; padding: 16px; border-left: 3px solid #ff2a85; margin: 16px 0;">
        <p style="margin: 0;">${data.message}</p>
      </div>
    </div>
  `,
});
```

---

## 5. Guía Práctica para el Cliente

Para que el dueño de Mumu Tech envíe sus newsletters sin riesgo de romper el diseño:

1. **Configuración Inicial**: Se crea una **Plantilla Maestra ("Master Template")** en Brevo o MailerLite con la cabecera, colores y footer de Mumu Tech ya programados.
2. **Redacción de Campaña**:
   - Iniciar sesión en la plataforma de correo.
   - Seleccionar **"Duplicar Plantilla Maestra"**.
   - Reemplazar los textos del nuevo taller o fotos del proyecto.
   - Enviar correo de prueba para verificar visualización.
3. **Envío**: Programar o hacer clic en **"Enviar a toda la lista"**.
