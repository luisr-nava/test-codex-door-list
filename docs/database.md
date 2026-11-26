# Base de datos

## Tablas y relaciones

- `public.events`: evento perteneciente a `auth.users` mediante `owner_id`; incluye `title`, `description`, `starts_at`, `venue`, `max_capacity`, `status`, timestamps y UUID.
- `public.ticket_types`: tipos de entrada pertenecientes a `events` mediante `event_id` con borrado en cascada; nombre único por evento, capacidad positiva y timestamps.
- `public.registrations`: registro de asistente perteneciente a `events` y a `ticket_types`. La FK compuesta `(ticket_type_id, event_id)` garantiza que la entrada corresponda al evento; al borrar el evento, sus registros se eliminan en cascada.
- `public.events.published_at`: fecha de la última publicación del evento, utilizada como inicio de la serie diaria del panel.
- `public.tickets`: entradas emitidas para un único registro mediante `registration_id` único. Contiene un código único de 64 caracteres hexadecimales, estado `valid`, `used` o `revoke` y timestamp de emisión; solo el propietario del evento asociado puede leerlas.

El enum `public.event_status` contiene `draft` y `published`. Hay índices para propietarios de eventos, eventos publicados por fecha, tipos por evento, registros por evento y registros por tipo.

## Restricciones y funciones

- Títulos, descripciones, lugares y nombres de entrada no pueden quedar vacíos tras recortar espacios.
- Capacidades de eventos y entradas deben ser mayores que cero.
- La capacidad combinada de entradas debe caber en el evento; se aplica mediante triggers de constraint, además de la validación de UI.
- `owner_id` y `event_id` no pueden cambiarse mediante actualización.
- La capacidad de una entrada no puede reducirse por debajo de sus registros confirmados.
- `registrations` impone email normalizado, formato básico, límites de longitud y un índice único `(event_id, email)`.
- `registration_is_open(event_status, timestamptz)` centraliza la vigencia pública por estado y fecha de Buenos Aires.
- `get_public_events()` y `get_public_event_registration(uuid)` devuelven datos públicos solo cuando la regla de registro abierto se cumple. La lista pública resume tipos de entrada disponibles y plazas restantes por evento.
- `create_public_registration(...)` normaliza datos, valida vigencia, duplicados y capacidad, e inserta el registro devolviendo un código de resultado.
- `create_public_registration(...)` emite atómicamente una entrada después de crear el registro y devuelve su código secreto.
- `get_public_ticket(text)` solo devuelve una entrada cuando recibe su código completo y no expone acceso directo a la tabla.

## RLS y privilegios

RLS está habilitado en `events`, `ticket_types` y `registrations`.

- `events`: lectura pública de publicados y lectura del propietario; inserción, actualización y borrado solo para usuarios autenticados propietarios. La migración final permite crear eventos propios en cualquiera de los dos estados.
- `ticket_types`: lectura pública si el evento está publicado o pertenece al usuario; escritura solo para el propietario del evento.
- `registrations`: sin privilegios directos para `anon`; usuarios autenticados pueden leer únicamente registros de sus eventos. La creación pública ocurre exclusivamente mediante la RPC con `security definer`.
- `tickets`: sin privilegios directos para `anon`; los usuarios autenticados solo pueden leer tickets de eventos propios mediante RLS. La lectura pública por código ocurre exclusivamente mediante `get_public_ticket(text)`.
- Las RPC públicas tienen ejecución concedida a `anon` y `authenticated`, mientras que sus privilegios directos sobre `registrations` permanecen revocados.

## Migraciones existentes

- `20261125000000_create_events_and_tickets_types.sql`: crea enum, eventos, tipos de entrada, triggers, restricciones iniciales, grants y políticas RLS.
- `20261125000001_add_event_capacity_constraint.sql`: agrega o rellena `events.max_capacity` y establece la protección de capacidad combinada.
- `20261125000002_allow_selected_event_status.sql`: elimina la obligación de que un evento publicado tenga previamente un tipo de entrada y permite crear eventos propios con el estado elegido.
- `20261125000003_create_public_registrations.sql`: crea registros, unicidad por email/evento, FK compuesta, protección de capacidad, RLS y las RPC públicas de lectura y alta.
- `20261126000004_create_tickets.sql`: crea las entradas emitidas, sus estados, la emisión atómica durante el registro y su consulta pública mediante código secreto.
- `20261126000005_rename_ticket_tables.sql`: aplicada; renombra `tickets_types` a `ticket_types` y `ticket` a `tickets`, y centraliza la regla de registro abierto.
- `20261126000007_add_event_published_at.sql`: añade la fecha de publicación y la conserva al publicar un evento.
- `20261126000008_allow_owners_to_read_tickets.sql`: permite por RLS que cada organizador autenticado lea los tickets de sus propios eventos para exportar asistentes.
- `20261126000006_fix_ticket_type_capacity_trigger.sql`: aplicada; actualiza la función del trigger de capacidad para consultar `ticket_types`.
- `20261126000009_add_public_event_availability_summary.sql`: añade a la RPC pública de eventos el resumen de tipos de entrada disponibles y plazas restantes.
