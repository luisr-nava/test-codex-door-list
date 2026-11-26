# Door List

Aplicación para publicar eventos, registrar asistentes, emitir entradas con QR y
controlar el ingreso. Usa Next.js, Supabase y Resend.

## Requisitos

- Node.js 20.9 o posterior y npm.
- Docker en ejecución para usar Supabase local.
- Supabase CLI instalado y disponible como `supabase`.
- Una cuenta y un remitente configurados en Resend si se quiere enviar el correo
  de confirmación.

Ejecuta los comandos desde la raíz del repositorio. La configuración local de
Supabase ya está en `supabase/config.jsonc`; no hace falta ejecutar
`supabase init`.

## Inicio local

En PowerShell:

```powershell
npm ci
supabase start
supabase status
Copy-Item .env.example .env.local
```

`supabase start` inicia los servicios locales y aplica las migraciones de
`supabase/migrations/` a la base local. `supabase status` muestra, entre otros
datos, **API URL** y **Publishable key**. Sustituye en `.env.local` los valores
de `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` por esos
dos valores. No copies la **Secret key** ni la **Service role key** a ninguna
variable `NEXT_PUBLIC_`.

El proyecto no incluye `supabase/seed.sql` ni usuarios de ejemplo. Crea una
cuenta de organizador desde `/organizador` después de iniciar la aplicación. Si
`.env.local` ya existe, conserva ese archivo y actualiza solo los valores
necesarios.

Para enviar correos, sustituye también `RESEND_API_KEY` y `RESEND_FROM_EMAIL`
por una clave y un remitente válidos de Resend. Los marcadores de posición de
`.env.example` no sirven para enviar mensajes. Si solo quieres probar el
registro y la entrada sin correo, elimina o deja vacías **ambas** variables de
Resend en `.env.local`; el registro seguirá creándose y la respuesta indicará
`emailStatus: "failed"`.

Después, inicia Next.js en otra terminal:

```powershell
npm run dev
```

Abre `http://localhost:3000`. Las rutas principales son `/` (eventos públicos),
`/organizador` (gestión), `/dashboard` (panel), `/eventos/[eventId]/registro`
(registro), `/entradas/[code]` (entrada emitida) y `/scan` (control de ingreso).
La cámara de `/scan` necesita `localhost` o HTTPS.

## Variables de entorno

`.env.example` es la plantilla preparada para versionarse; `.env.local` contiene
los valores locales y está excluido de Git. Next.js carga `.env.local` al
iniciar el servidor. Reinicia `npm run dev` después de cambiar variables
públicas. En producción, las variables `NEXT_PUBLIC_` se incorporan al bundle
del navegador durante `npm run build`: configúralas antes de compilar.

| Variable                               | Uso                                                                            | Exposición                                 | Si falta                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL de la API Supabase en `lib/supabase/client.ts` y `lib/supabase/server.ts`. | Pública; llega al navegador.               | No se puede crear el cliente Supabase ni consultar datos o iniciar sesión. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable de Supabase en los mismos clientes.                           | Pública; el acceso a datos depende de RLS. | Mismo efecto que la URL.                                                   |
| `RESEND_API_KEY`                       | Autenticación del envío en `lib/tickets/email.ts`.                             | Secreta; solo servidor.                    | La entrada se emite, pero falla el correo.                                 |
| `RESEND_FROM_EMAIL`                    | Remitente del correo en `lib/tickets/email.ts`.                                | Solo se configura en el servidor.          | La entrada se emite, pero falla el correo.                                 |

La configuración local de Supabase (`supabase/config.jsonc`) también referencia
estas variables **opcionales**. No son necesarias para iniciar Door List con las
funciones actuales:

| Variable                              | Uso en Supabase local                                            | Si falta                                                                        |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                      | Asistente de IA de Supabase Studio.                              | No afecta a la aplicación; esa función queda sin clave.                         |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Proveedor SMS Twilio, deshabilitado en la configuración actual.  | Sin efecto mientras siga deshabilitado.                                         |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | Proveedor Apple OAuth, deshabilitado en la configuración actual. | Sin efecto mientras siga deshabilitado.                                         |
| `S3_HOST`, `S3_REGION`                | Destino S3 de las opciones experimentales de Supabase.           | Sin efecto en los flujos actuales; hacen falta si se configura esa integración. |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`      | Credenciales de esa integración S3.                              | Igual que las otras opciones S3; deben mantenerse en el servidor.               |

Las opciones comentadas de ejemplo en `supabase/config.jsonc` no requieren
variables adicionales. No añadas claves secretas de Supabase, Resend o
proveedores externos al navegador ni al repositorio.

## Comprobaciones y operación

```powershell
npm run lint
npm test
npm run build
```

`npm run lint` ejecuta la comprobación de tipos de TypeScript; `npm test`
ejecuta la prueba declarada en `package.json`. Para iniciar el build compilado,
usa `npm run start` después de `npm run build`.

Para consultar el estado de los servicios locales, ejecuta `supabase status`.
Para detenerlos, usa `supabase stop`. Si se añaden migraciones después de haber
iniciado Supabase, aplícalas a la base local con `supabase db push` y revisa el
destino indicado por el CLI antes de confirmar. `supabase db reset` recrea la
base **local** y elimina sus datos; úsalo solo cuando quieras empezar de cero.
No uses `--remote` para el arranque local.

Si usas un proyecto Supabase alojado en lugar de `supabase start`, configura en
`.env.local` su URL y su clave publicable y asegúrate de que tenga aplicadas las
migraciones del repositorio. Un `supabase start` local no modifica ese proyecto
remoto.

