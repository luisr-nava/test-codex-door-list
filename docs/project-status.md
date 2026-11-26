# Estado del proyecto

## Implementado

- Panel de organizador con registro e inicio de sesión mediante Supabase Auth.
- Landing pública de eventos en `/` y panel del organizador separado en `/organizador`.
- CRUD de eventos propios con estados borrador/publicado.
- CRUD de tipos de entrada por evento.
- Visualización de aforo asignado y validación de capacidad en UI y base de datos.
- Enlace público de registro, apertura en nueva pestaña y copia al portapapeles.
- Página pública con datos del evento, disponibilidad por entrada y estado de agotado.
- Registro de asistentes con validación cliente/servidor, normalización de email, prevención de duplicados y control de concurrencia mediante bloqueo SQL.
- Emisión atómica de una entrada por registro, con código secreto, estado y página pública con QR.
- Email de confirmación mediante Resend, con los datos del evento y el QR embebido.
- Políticas RLS y funciones SQL para separar operaciones del organizador y del público.
- Tipos, formatos de fecha y conversiones entre dominio y persistencia centralizados en `lib/`.

## Estado actual

La base funcional para crear eventos y registrar asistentes está implementada en el código inspeccionado. La migración pendiente `20261126000005_rename_ticket_tables.sql` alinea los nombres de tablas con el vocabulario del dominio y centraliza la vigencia del registro público; no está aplicada a la base de datos.

## Pendientes o no evidenciados

- No existe en los archivos inspeccionados una lista formal de pendientes o roadmap.
- No se observa una pantalla del organizador para consultar la tabla `registrations`.
- No se observan cancelaciones, pagos ni reportes.
- `package.json` no declara scripts de pruebas o lint; no se ejecutaron verificaciones contra la base de datos.

Las ausencias anteriores se documentan como funcionalidades no evidenciadas en esta inspección, no como requisitos confirmados.
