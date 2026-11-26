# Estado del proyecto

## Implementado

- Panel de organizador con registro e inicio de sesión mediante Supabase Auth.
- CRUD de eventos propios con estados borrador/publicado.
- CRUD de tipos de entrada por evento.
- Visualización de aforo asignado y validación de capacidad en UI y base de datos.
- Enlace público de registro, apertura en nueva pestaña y copia al portapapeles.
- Página pública con datos del evento, disponibilidad por entrada y estado de agotado.
- Registro de asistentes con validación cliente/servidor, normalización de email, prevención de duplicados y control de concurrencia mediante bloqueo SQL.
- Emisión atómica de una entrada por registro, con código secreto, estado y página pública con QR.
- Email de confirmación mediante Resend, con los datos del evento y el QR embebido.
- Políticas RLS y funciones SQL para separar operaciones del organizador y del público.

## Estado actual

La base funcional para crear eventos y registrar asistentes está implementada en el código inspeccionado. Las migraciones disponibles cubren el esquema descrito y la última migración añade el flujo público de registros.

## Pendientes o no evidenciados

- No existe en los archivos inspeccionados una lista formal de pendientes o roadmap.
- No se observa una pantalla del organizador para consultar la tabla `registrations`.
- No se observan cancelaciones, pagos ni reportes.
- `package.json` no declara scripts de pruebas o lint; no se ejecutaron verificaciones contra la base de datos.

Las ausencias anteriores se documentan como funcionalidades no evidenciadas en esta inspección, no como requisitos confirmados.
