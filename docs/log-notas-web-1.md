# Log de Notas, Revisión y Mejoras Web (Parte 1)

Documento de análisis, revisiones, correcciones, mejoras y comentarios sobre las distintas secciones y aspectos generales del sitio web **Mumu Tech**.

---

## 1. Home
* **Descripciones:** Revisar y ajustar textos descriptivos.
* **Layout:** Evaluar y pulir la distribución y estructura visual.

---

## 2. General
* **Colores y fuentes de texto:** En este momento es una copia directa de la referencia visual; la idea es tomarlo como punto de partida e ir personalizándolo.
* **Imágenes:** Actualmente son de Unsplash (gratuitas y solo de referencia). La idea a futuro es utilizar imágenes reales del taller, las cuales se pueden subir aprovechando la capa gratuita de Cloudinary.
* **Placeholder de imágenes:** Se dejó una tarjeta sin imagen a propósito para visualizar el placeholder implementado, el cual actúa como fallback en caso de que alguna imagen se caiga y evita que el contenedor quede vacío.
* **Panel Administrativo (`/admin`):**
  * Existe la ruta `/admin` con un dashboard para la gestión del contenido (actualmente no está en funcionamiento operativo completo, los datos provienen de un *seeder* en código que los carga al compilar el sitio).
  * La meta es conectar este dashboard a Supabase para gestionar la autenticación del administrador y la base de datos del contenido editable.
  * La ruta `/admin` no está referenciada en ninguna parte pública del sitio web para evitar intentos de acceso no autorizados; el ingreso se realiza escribiendo la ruta manualmente en la barra de direcciones.

---

## 3. Educativa y Servicios
* **Contenido:** Revisar y definir descripciones, información y valores/precios.
* **Páginas de detalle:** Falta agregar la ruta y página detallada individual para cada taller o servicio (por ejemplo: `/educativa/taller-fuzz/` o `/servicios/reparaciones-y-modificaciones`) con información técnica y descriptiva extendida.

---

## 4. Cosas Interesantes y DIY
* **Propuesta de Layout:** Esta sección podría romper el patrón de tarjetas de las otras dos secciones y convertirse en una **galería tipo grilla o Bento Box** de imágenes.
* **Interacción (Modal):** Al hacer clic sobre un elemento, se abriría un modal con información detallada, scrolleable, que permita cerrarse haciendo clic fuera del contenedor o mediante un botón de cerrar (X).

---

## 5. Contacto
* **Canales de atención:** Enlaces a redes sociales y canales directos con comentarios según el caso de uso (WhatsApp para comunicación directa, correo para cotizaciones formales, Instagram para demos, etc.).
* **Newsletter:** Se agregó un formulario independiente para suscripción a la lista de correo. La estructura actual es flexible y puede adaptarse, ampliarse o simplificarse según la necesidad.
* **Formulario de contacto:** Se incluyó a modo de demostración de su potencial; si se decide no utilizarlo, se puede ocultar fácilmente.
* **Servicios de envío para formulario de contacto:** Existen opciones gratuitas como **Formspree** o **Resend** (Formspree ya ha sido probado con buen funcionamiento; Resend ofrece ventajas adicionales en su capa gratuita).
* **Servicios para Newsletter y Campañas:** Para campañas masivas de correo existen servicios gratuitos como **Brevo**, **MailerLite** y **Buttondown**. Para correos transaccionales automáticos se puede utilizar **Resend**. Se puede incorporar una plantilla maestra que conserve el branding y diseño del sitio web para mantener una total coherencia visual.
