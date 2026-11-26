# Arquitectura

## Stack

- Next.js `16.4.6` con App Router y TypeScript estricto.
- React `19.3.1` y `react-dom`.
- Tailwind CSS `4.3.5` mediante PostCSS; estilos globales en `app/globals.css`.
- Supabase JS `2.119.2` para autenticación, consultas y RPC.
- Supabase/PostgreSQL para persistencia, RLS, constraints y funciones SQL.
- Recharts está declarado como dependencia, pero no se usa en los módulos inspeccionados.

## Estructura y responsabilidades

- `app/layout.tsx`: layout raíz, idioma `es` y metadatos.
- `app/page.tsx`: landing pública; lista eventos mediante la RPC pública que centraliza la regla de registro abierto.
- `app/organizador/page.tsx`: cliente principal del panel del organizador. Gestiona sesión, CRUD de eventos y tipos de entrada, cálculo de aforo y enlaces públicos.
- `app/dashboard/page.tsx` y `app/(dashboard)/dashboard/[eventId]/page.tsx`: panel privado de consulta de eventos, aforo por tipo de entrada, evolución diaria, asistentes y exportación CSV.
- `app/api/events/[eventId]/daily-registrations/route.ts`: endpoint autenticado para la serie diaria de registros del organizador.
- `app/eventos/[eventId]/registro/page.tsx`: página pública de registro; valida el UUID, carga los datos mediante servidor y muestra el evento.
- `app/eventos/[eventId]/registro/registration-form.tsx`: formulario cliente; selecciona entrada, muestra disponibilidad y procesa estados de éxito/error.
- `app/api/events/[eventId]/register/route.ts`: API pública de registro; valida JSON camelCase, traduce códigos de negocio a HTTP y refresca disponibilidades.
- `app/eventos/[eventId]/registro/not-found.tsx`: pantalla para eventos inexistentes, no publicados o fuera de fecha.
- `app/entradas/[code]/page.tsx`: página pública de una entrada emitida; consulta por código secreto y renderiza sus datos, estado y QR.
- `lib/supabase/client.ts`: cliente Supabase para componentes cliente, usando variables públicas de entorno.
- `lib/supabase/server.ts`: cliente Supabase sin persistencia de sesión para código servidor.
- `lib/types.ts`: tipos de dominio y contratos compartidos entre UI, API y correo.
- `lib/date-time.ts`: formateo compartido de fechas de eventos en Buenos Aires.
- `lib/export/attendees-csv.ts`: filtra tickets vendibles y genera el CSV de asistentes con BOM UTF-8 y escape compatible con Excel.
- `lib/supabase/mappers.ts`: traducción entre modelos de dominio en `camelCase` y filas o payloads de persistencia en `snake_case`.
- `lib/registrations/data.ts`: acceso servidor a las RPC públicas y validación básica de la respuesta.
- `lib/tickets/email.ts`: genera el QR PNG e invoca la API de Resend para enviar la entrada por correo con la imagen embebida.
- `supabase/migrations/`: evolución del esquema, restricciones, funciones y políticas RLS.
- `next.config.ts`: configuración Next.js actualmente vacía.
- `tsconfig.json`: alias `@/*`, JSX React, resolución bundler y modo estricto.

## Flujo de alto nivel

La landing pública consulta las RPC que centralizan la regla de registro abierto según el día de Buenos Aires. El panel en `/organizador` autentica al organizador con Supabase Auth y consulta directamente `events` y `ticket_types`. El formulario público usa la API de registro para leer disponibilidad, crear el registro y emitir una entrada; PostgreSQL conserva la validación final de disponibilidad y unicidad. Tras emitirla, el Route Handler obtiene la entrada por su código secreto y envía un email con QR inline mediante Resend. La entrada pública se consulta exclusivamente por su código secreto.
