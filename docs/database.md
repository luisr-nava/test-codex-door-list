# Base de datos

## Tablas y relaciones

- `public.events`: evento perteneciente a `auth.users` mediante `owner_id`; incluye `title`, `description`, `starts_at`, `venue`, `max_capacity`, `status`, timestamps y UUID.
- `public.tickets_types`: tipos de entrada pertenecientes a `events` mediante `event_id` con borrado en cascada; nombre único por evento, capacidad positiva y timestamps.
- `public.registrations`: registro de asistente perteneciente a `events` y a `tickets_types`. La FK compuesta `(ticket_type_id, event_id)` garantiza que la entrada corresponda al evento; al borrar el evento, sus registros se eliminan en cascada.

El enum `public.event_status` contiene `draft` y `published`. Hay índices para propietarios de eventos, eventos publicados por fecha, tipos por evento, registros por evento y registros por tipo.

## Restricciones y funciones

- Títulos, descripciones, lugares y nombres de entrada no pueden quedar vacíos tras recortar espacios.
- Capacidades de eventos y entradas deben ser mayores que cero.
- La capacidad combinada de entradas debe caber en el evento; se aplica mediante triggers de constraint, además de la validación de UI.
- `owner_id` y `event_id` no pueden cambiarse mediante actualización.
- La capacidad de una entrada no puede reducirse por debajo de sus registros confirmados.
- `registrations` impone email normalizado, formato básico, límites de longitud y un índice único `(event_id, email)`.
- `get_public_event_registration(uuid)` devuelve datos públicos y disponibilidad restante solo para eventos publicados vigentes.
- `create_public_registration(...)` normaliza datos, valida vigencia, duplicados y capacidad, e inserta el registro devolviendo un código de resultado.

## RLS y privilegios

RLS está habilitado en `events`, `tickets_types` y `registrations`.

- `events`: lectura pública de publicados y lectura del propietario; inserción, actualización y borrado solo para usuarios autenticados propietarios. La migración final permite crear eventos propios en cualquiera de los dos estados.
- `tickets_types`: lectura pública si el evento está publicado o pertenece al usuario; escritura solo para el propietario del evento.
- `registrations`: sin privilegios directos para `anon`; usuarios autenticados pueden leer únicamente registros de sus eventos. La creación pública ocurre exclusivamente mediante la RPC con `security definer`.
- Las RPC públicas tienen ejecución concedida a `anon` y `authenticated`, mientras que sus privilegios directos sobre `registrations` permanecen revocados.

## Migraciones existentes

- `20261125000000_create_events_and_tickets_types.sql`: crea enum, eventos, tipos de entrada, triggers, restricciones iniciales, grants y políticas RLS.
- `20261125000001_add_event_capacity_constraint.sql`: agrega o rellena `events.max_capacity` y establece la protección de capacidad combinada.
- `20261125000002_allow_selected_event_status.sql`: elimina la obligación de que un evento publicado tenga previamente un tipo de entrada y permite crear eventos propios con el estado elegido.
- `20261125000003_create_public_registrations.sql`: crea registros, unicidad por email/evento, FK compuesta, protección de capacidad, RLS y las RPC públicas de lectura y alta.
