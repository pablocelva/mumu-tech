<div align="center">

# 🎛️ MUMU TECH
### Laboratorio de Electrónica DIY, Pedales de Guitarra, Reparaciones & Artefactos Sonoros

[![Astro](https://img.shields.io/badge/Astro-v7.3.5-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11.x-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Zod](https://img.shields.io/badge/Zod-v4.x-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Vitest Coverage](https://img.shields.io/badge/Test_Coverage-97.2%25_(V8)-39FF14?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)

<p align="center">
  <strong>Plataforma web minimalista retro inspirada en la estética del internet clásico (Lo-Fi Future / Analog Synth DIY) para talleres prácticos de electrónica, pedales de efectos de guitarra, servicio técnico, circuit bending y bitácora de proyectos abiertos.</strong>
</p>

</div>

---

## 📑 Tabla de Contenidos

- [Visión del Proyecto](#-visión-del-proyecto)
- [Identidad Visual & Estética](#-identidad-visual--estética)
- [Estructura de Secciones](#-estructura-de-secciones)
- [Arquitectura de Software & Clean Code](#-arquitectura-de-software--clean-code)
- [Stack Tecnológico](#-stack-tecnológico)
- [Panel de Administración (`/admin`)](#-panel-de-administración-admin)
- [Integraciones (Supabase & Cloudinary)](#-integraciones-supabase--cloudinary)
- [Estrategia de Email & Newsletter (`docs/`)](./docs/EMAIL_AND_NEWSLETTER_STRATEGY.md)
- [SEO & Accesibilidad](#-seo--accesibilidad)
- [Testing & Cobertura de Código](#-testing--cobertura-de-código)
- [Scripts del Proyecto](#-scripts-del-proyecto)
- [Guía de Despliegue (Netlify)](#-guía-de-despliegue-netlify)

---

## 🎯 Visión del Proyecto

**Mumu Tech** nace como el punto de encuentro para entusiastas de la música, el audio analógico y la cultura DIY (*Do It Yourself*). Su misión principal es:

1. **Educativa**: Talleres presenciales y guías donde personas sin formación previa aprenden a soldar y ensamblar pedales de distorsión, Fuzz, osciladores CMOS y sintetizadores de ruido.
2. **Servicios**: Diagnóstico y reparación especializada a nivel de componente para pedales de guitarra, amplificadores valvulares, cambio de switches *True Bypass* y modificaciones sonoras a medida (*tone mods*).
3. **Cosas Interesantes**: Bitácora técnica y *open hardware* de experimentos analógicos: convertidores de video VGA para monitores CRT (video glitch), grabadoras de cassette modificadas con bucles infinitos (*tape delay*) y circuitos ópticos experimentales.
4. **Comunidad & Contacto**: Canales directos y sin fricción (WhatsApp con mensajes preformateados, Instagram, botón de copiado de correo al portapapeles con feedback y formulario con suscripción a mailing list).

---

## 🎨 Identidad Visual & Estética

Siguiendo el diseño de referencia (**Lo-Fi Future**):

- **Anti-Corporate / Internet Clásico**: Se aleja de los diseños genéricos y adopta la energía del internet de los 90s/2000s, el *cassette futurism* y los fanzines de electrónica.
- **Fondo Cromático Analógico**: Gradiente líquido psicodélico de alta saturación con aberración cromática, desenfoque profundo y capa de textura de *scanlines* CRT.
- **Tipografía Vintage**: Logotipo condensado e inclinado (*slanted neon gradient*), encabezados limpios con contrastes nítidos y nomenclaturas de catálogo numerado (`001 - FUZZ GERMANIO`, `002 - CMOS NOISE SYNTH`, etc.).
- **Componentes Frosted**: Tarjetas translúcidas con `backdrop-filter: blur(14px)`, bordes tenues y badges de neón en tonos magenta (`#ff2a85`), cian (`#00f0ff`) y verde fósforo (`#39ff14`).

---

## 🗺️ Estructura de Secciones

| Ruta | Nombre | Propósito |
|---|---|---|
| `/` | **Home** | Portada con manifiesto de bienvenida, tarjetas resumen de las 3 áreas con enlaces directos, destacados y CTA de contacto rápido. |
| `/educativa` | **Educativa** | Catálogo de talleres prácticos (Fuzz Germanio, Síntesis CMOS, Soldadura audiófila) con precios en CLP, niveles y reserva de cupos. |
| `/servicios` | **Servicios** | Listado de servicios de taller (Reparación de pedales, modificaciones de circuito, calibración de bias en tubos) y tiempos estimados. |
| `/cosas-interesantes` | **Cosas Interesantes** | Bitácora de experimentos libres, hacks de sintetizadores de video, *tape delay* y esquemáticos *open source*. |
| `/contacto` | **Contacto** | Conectividad multicanal: Botón directo WhatsApp, enlace a Instagram, botón accesible para copiar email al portapapeles y formulario con validación en tiempo real (`:user-invalid`). |
| `/admin` | **Admin Privado** | Panel seguro con autenticación de Supabase (y fallback demo) para CRUD de talleres, servicios, proyectos y lectura de mensajes de contacto. |

---

## 🏛️ Arquitectura de Software & Clean Code

El proyecto sigue una arquitectura en capas desacoplada y orientada al dominio:

```text
mumu-tech/
├── docs/                      # Documentación técnica extendida
│   └── EMAIL_AND_NEWSLETTER_STRATEGY.md # Estrategia Resend, Brevo y Branding
├── public/
│   └── images/
│       └── placeholder.svg    # Fallback gráfico retro para imágenes caídas
├── src/
│   ├── components/            # Componentes UI semánticos y CSS Modules
│   │   ├── admin/             # LoginForm & Dashboard administrativo
│   │   ├── Badge.astro        # Etiquetas retro de categoría y estado
│   │   ├── Button.astro       # Botones polimórficos accesibles (link/button)
│   │   ├── Card.astro         # Tarjetas de catálogo e imágenes con fallback
│   │   ├── ClipboardButton.astro # Copiado con feedback aria-live
│   │   ├── ContactChannels.astro # Panel unificado de canales de atención (WhatsApp, Email, IG)
│   │   ├── ContactForm.astro  # Formulario semántico accesible
│   │   ├── Footer.astro       # Pie de página y enlaces
│   │   ├── Header.astro       # Navbar con menú hamburguesa responsivo (<=880px)
│   │   ├── NewsletterForm.astro # Formulario rápido e independiente de mailing list
│   │   ├── SectionHeader.astro # Título centrado y descripción lofi
│   │   └── SEO.astro          # Open Graph, Twitter cards, JSON-LD Schema
│   ├── layouts/
│   │   └── Layout.astro       # Shell principal con fondos lofi y metadatos
│   ├── lib/                   # Infraestructura y utilidades puras
│   │   ├── clipboard.ts       # Helper seguro con fallback para portapapeles
│   │   ├── cloudinary.ts      # Transformaciones y optimización de imágenes
│   │   ├── env.ts             # Validación Zod de variables de entorno
│   │   ├── seo.ts             # Generadores de Schema.org (LocalBusiness, Course)
│   │   └── supabase.ts        # Cliente Supabase con fallback local
│   ├── pages/                 # Rutas Astro y Server Endpoints
│   │   ├── api/               # Endpoints REST (/api/contact, /api/auth, /api/content)
│   │   ├── admin/             # Gating del panel administrativo privado
│   │   ├── cosas-interesantes.astro
│   │   ├── contacto.astro
│   │   ├── educativa.astro
│   │   ├── servicios.astro
│   │   ├── index.astro
│   │   └── robots.txt.ts      # Generador dinámico de robots.txt
│   ├── repositories/          # Patrón Repositorio (Supabase / In-Memory Seed)
│   │   ├── auth.repository.ts
│   │   ├── content.repository.ts
│   │   └── seed.data.ts
│   ├── schemas/               # Esquemas de validación Zod
│   │   └── index.ts
│   ├── styles/                # Estilos globales y módulos CSS
│   │   ├── global.css
│   │   └── theme.module.css
│   └── types/                 # Interfaces y tipos TypeScript
│       └── index.ts
├── tests/                     # Suite de pruebas unitarias e integración (Vitest)
├── astro.config.mjs           # Configuración dual (Netlify Adapter / Node)
├── netlify.toml               # Configuración de build y security headers en Netlify
├── package.json               # Dependencias y scripts pnpm
├── tsconfig.json              # Configuración TypeScript estricta
└── vitest.config.ts           # Configuración de cobertura V8
```

### Principios Aplicados:
- **Single Responsibility (SRP)**: Separación clara entre validación (Zod), persistencia (Repositories), utilidades (Lib), presentación (Astro Components) y estilos (CSS Modules).
- **Graceful Degradation / Offline First**: Funciona al 100% de manera inmediata sin necesidad obligatoria de configurar Supabase en el primer arranque, utilizando el almacenamiento en memoria y datos semilla curados.
- **Type Safety Total**: Tipado estricto en TypeScript sin `any` arbitrarios, con inferencia directa desde los esquemas de Zod.
- **HTML Semántico & Accesibilidad**: Uso riguroso de `<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<figure>` y roles ARIA (`aria-live`, `aria-current`, `role="status"`).
- **Diseño Responsivo Sin Overflows**: Contenedores y tipografías fluidas (`clamp()`) con navegación colapsable en drawer para móvil/tablet y control estricto de desbordamiento horizontal.

---

## ⚡ Stack Tecnológico

- **[Astro 5+](https://astro.build/)**: Framework web enfocado en contenido de alto rendimiento, arquitectura de islas y renderizado híbrido.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático con configuración estricta.
- **[pnpm](https://pnpm.io/)**: Gestor de paquetes rápido, eficiente en disco y determinista.
- **[Zod](https://zod.dev/)**: Validación de esquemas en tiempo de ejecución para formularios, payloads de API y variables de entorno.
- **[CSS Modules](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_modules)**: Estilos modulares, sin colisiones de nombres y totalmente desacoplados de frameworks CSS pesados.
- **[Vitest & V8 Coverage](https://vitest.dev/)**: Framework de pruebas ultrarrápido con reportes de cobertura nativos V8.
- **[Netlify](https://www.netlify.com/)**: Plataforma de despliegue con cabeceras de seguridad HTTP (`X-Frame-Options`, `X-Content-Type-Options`, `Cache-Control`).
- **[Supabase](https://supabase.com/)**: Base de datos PostgreSQL y motor de autenticación para administradores.
- **[Cloudinary](https://cloudinary.com/)**: CDN de imágenes con entrega en formatos modernos (WebP/AVIF) y compresión automática.

---

## 🔐 Panel de Administración (`/admin`)

El panel privado permite gestionar todo el catálogo de Mumu Tech en tiempo real:

- **Autenticación**: Integrada con Supabase Auth.
  - *Credenciales Modo Demo (desarrollo):*
    - **Usuario**: `admin@mumutech.com`
    - **Contraseña**: `mumutech2026`
- **Gestión de Talleres Educativos**: Ver código, título, nivel, precio y eliminar entradas.
- **Gestión de Servicios & Reparaciones**: Control de tipos de servicio y precios base.
- **Gestión de Cosas Interesantes**: Administración de experimentos y proyectos DIY.
- **Bandeja de Mensajes**: Visualización de contactos recibidos y registros de mailing list.
- **Publicación de Nuevo Contenido**: Formulario directo con carga de imágenes y sincronización con Supabase.

---

## ☁️ Integraciones (Supabase & Cloudinary)

Copia el archivo `.env.example` a `.env` para conectar tus credenciales reales:

```env
# Supabase
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Cloudinary
PUBLIC_CLOUDINARY_CLOUD_NAME=mumu-tech
CLOUDINARY_API_KEY=tu-cloudinary-key
CLOUDINARY_API_SECRET=tu-cloudinary-secret
```

Si estas variables no están configuradas, el repositorio conmuta automáticamente al **modo local en memoria con datos semilla**, permitiendo probar la aplicación inmediatamente.

---

## 🔍 SEO & Accesibilidad

- **Metadatos Open Graph & Twitter Cards**: Títulos, descripciones e imágenes adaptadas para previsualizaciones en redes sociales y WhatsApp.
- **Datos Estructurados JSON-LD**:
  - `schema.org/LocalBusiness`: Registro del taller físico, horarios, teléfono y redes.
  - `schema.org/Course`: Marcado semántico para talleres educativos y precios en CLP.
- **`robots.txt` & `sitemap.xml`**: Generados automáticamente para rastreadores de motores de búsqueda.
- **Modern Web Guidelines**: Validación nativa de formularios con pseudo-clases `:user-valid` y `:user-invalid` para evitar mensajes de error prematuros mientras el usuario escribe.

---

## 🧪 Testing & Cobertura de Código

El proyecto cuenta con una suite completa de **55 pruebas unitarias e integración** con cobertura superior al 95%:

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   97.27 |    93.10 |     100 |   97.14 |                   
 lib               |   97.87 |    95.65 |     100 |   97.82 |                   
  clipboard.ts     |   95.23 |    88.88 |     100 |   95.00 | 31                
  cloudinary.ts    |  100.00 |    94.73 |     100 |  100.00 | 34                
  env.ts           |  100.00 |   100.00 |     100 |  100.00 |                   
  seo.ts           |  100.00 |   100.00 |     100 |  100.00 |                   
  supabase.ts      |  100.00 |   100.00 |     100 |  100.00 |                   
 repositories      |   96.59 |    91.42 |     100 |   96.34 |                   
  ...repository.ts |   96.15 |    87.09 |     100 |   96.00 | 96                
  ...repository.ts |   96.55 |    94.87 |     100 |   96.22 | 22,99             
  seed.data.ts     |  100.00 |   100.00 |     100 |  100.00 |                   
 schemas           |  100.00 |   100.00 |     100 |  100.00 |                   
  index.ts         |  100.00 |   100.00 |     100 |  100.00 |                   
-------------------|---------|----------|---------|---------|-------------------
```

Para ejecutar las pruebas:

```bash
# Ejecutar todas las pruebas una vez
pnpm run test

# Modo interactivo / watch
pnpm run test:watch

# Generar reporte de cobertura V8
pnpm run test:coverage
```

---

## 💻 Scripts del Proyecto

| Comando | Acción |
|---|---|
| `pnpm run dev` | Inicia el servidor de desarrollo local en `http://localhost:4321`. |
| `pnpm run build` | Compila la aplicación y genera los assets optimizados en `dist/`. |
| `pnpm run preview` | Previsualiza el build de producción localmente. |
| `pnpm run test` | Ejecuta la suite de pruebas unitarias e integración con Vitest. |
| `pnpm run test:coverage` | Ejecuta las pruebas y valida los umbrales de cobertura con V8. |

---

## 🚀 Guía de Despliegue (Netlify)

1. Conecta tu repositorio de GitHub a **Netlify**.
2. Netlify detectará automáticamente el archivo `netlify.toml` con la siguiente configuración:
   - **Build command**: `pnpm run build`
   - **Publish directory**: `dist`
   - **Node version**: `>=22.12.0`
3. En la sección **Environment Variables** de Netlify, agrega tus claves de Supabase y Cloudinary (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_CLOUDINARY_CLOUD_NAME`).
4. ¡Listo! El sitio se desplegará globalmente en la red de Netlify con soporte para páginas estáticas y funciones serverless para la API y el panel de administración.

---

<div align="center">
  <sub>MUMU TECH — Electrónica analógica, pedales y cultura DIY con estética de internet clásico.</sub>
</div>
