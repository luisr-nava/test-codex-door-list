# Estado del proyecto

## Implementado

- Panel de organizador con registro e inicio de sesión mediante Supabase Auth.
- Landing pública de eventos en `/` y panel del organizador separado en `/organizador`.
- Landing pública con carga progresiva, reintento seguro y resumen de disponibilidad por evento.
- CRUD de eventos propios con estados borrador/publicado.
- CRUD de tipos de entrada por evento.
- Panel privado `/dashboard` para consultar eventos propios, ocupación por tipo de entrada y asistentes registrados.
- Gráfica diaria de registros desde la publicación en el detalle privado de cada evento.
- Exportación CSV de asistentes con tickets vendidos y ocupación por tipo de entrada en el detalle privado.
- Visualización de aforo asignado y validación de capacidad en UI y base de datos.
- Enlace público de registro, apertura en nueva pestaña y copia al portapapeles.
- Página pública con datos del evento, disponibilidad por entrada y estado de agotado.
- Registro de asistentes con validación cliente/servidor, normalización de email, prevención de duplicados y control de concurrencia mediante bloqueo SQL.
- Emisión atómica de una entrada por registro, con código secreto, estado y página pública con QR.
- Email de confirmación mediante Resend, con los datos del evento y el QR embebido.
- API pública de registro con JSON en `camelCase`, errores `{ error }`, códigos HTTP de negocio y mensajes seguros en la interfaz.
- Políticas RLS y funciones SQL para separar operaciones del organizador y del público.
- Tipos, formatos de fecha y conversiones entre dominio y persistencia centralizados en `lib/`.
- Pantalla `/scan` para lectura de QR o código manual, check-in atómico y estados de resultado; el detalle del organizador refleja el estado de ingreso.

## Estado actual

La base funcional para crear eventos, registrar asistentes y hacer check-in está implementada. La migración `20261126000010_add_ticket_check_in.sql` se aplicó a la base enlazada de producción.

## Pendientes o no evidenciados

- No existe en los archivos inspeccionados una lista formal de pendientes o roadmap.
- No se observa una pantalla del organizador para consultar la tabla `registrations`.
- No se observan cancelaciones, pagos ni reportes.
- `package.json` no declara scripts de pruebas o lint; no se ejecutaron verificaciones contra la base de datos.

Las ausencias anteriores se documentan como funcionalidades no evidenciadas en esta inspección, no como requisitos confirmados.
