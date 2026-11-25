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
- `app/page.tsx`: cliente principal del panel del organizador. Gestiona sesión, CRUD de eventos y tipos de entrada, cálculo de aforo y enlaces públicos.
- `app/eventos/[eventId]/registro/page.tsx`: página pública de registro; valida el UUID, carga los datos mediante servidor y muestra el evento.
- `app/eventos/[eventId]/registro/registration-form.tsx`: formulario cliente; selecciona entrada, muestra disponibilidad y procesa estados de éxito/error.
- `app/eventos/[eventId]/registro/actions.ts`: Server Action de registro; valida campos, invoca la RPC y refresca entradas cuando una opción se agota.
- `app/eventos/[eventId]/registro/not-found.tsx`: pantalla para eventos inexistentes, no publicados o fuera de fecha.
- `lib/supabase/client.ts`: cliente Supabase para componentes cliente, usando variables públicas de entorno.
- `lib/supabase/server.ts`: cliente Supabase sin persistencia de sesión para código servidor.
- `lib/registrations/types.ts`: tipos del flujo público de registro y sus códigos de resultado.
- `lib/registrations/data.ts`: acceso servidor a las RPC públicas y validación básica de la respuesta.
- `supabase/migrations/`: evolución del esquema, restricciones, funciones y políticas RLS.
- `next.config.ts`: configuración Next.js actualmente vacía.
- `tsconfig.json`: alias `@/*`, JSX React, resolución bundler y modo estricto.

## Flujo de alto nivel

El panel cliente autentica al organizador con Supabase Auth y consulta directamente `events` y `tickets_types`. El registro público se renderiza en servidor, usa RPC de Supabase para leer disponibilidad y crear registros, y delega la validación final de disponibilidad y unicidad a PostgreSQL.
