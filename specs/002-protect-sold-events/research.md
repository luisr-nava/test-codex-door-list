# Investigación de la Feature 002

## Punto de control y recuento

**Decisión.** Incorporar un trigger `BEFORE DELETE FOR EACH ROW` en `public.events`. La función PL/pgSQL `VOLATILE` cuenta las filas de `tickets` unidas a `registrations` para `OLD.id`, incluidos los estados `valid`, `used` y `revoke`. Un total positivo produce el [conflicto de eliminación](contracts/event-deletion.md).

**Motivo.** El trigger se ejecuta antes de las cascadas, también al borrar un evento por la FK desde `auth.users`. El join distingue una entrada emitida de un registro histórico o pendiente sin entrada y aprovecha los índices existentes de `registrations.event_id` y `tickets.registration_id`. Usar `SECURITY DEFINER` con el propietario autorizado, `search_path = ''`, nombres calificados y con `EXECUTE` revocado explícitamente a `PUBLIC`, `anon` y `authenticated` permite un recuento completo. La autorización del borrado sigue en RLS. [Triggers en PostgreSQL 17](https://www.postgresql.org/docs/17/sql-createtrigger.html)

**Alternativas evaluadas.** Un recuento en la UI o en una RPC no cubre el borrado directo y puede quedar desactualizado. Reutilizar el recuento del CSV excluiría las entradas revocadas. Un contador persistido agregaría escrituras y sincronización de datos existentes.

## Concurrencia

**Decisión.** Reutilizar los bloqueos de `create_public_registration` y las FK vigentes. Es la RPC activa en el código y las migraciones inspeccionadas, donde no se encontró `register_for_event`.

**Motivo.** La RPC adquiere `FOR SHARE` en el evento y luego `FOR UPDATE` en el tipo de entrada. Inserta registro y entrada en la misma transacción. PostgreSQL toma el bloqueo exclusivo de la fila antes del trigger de borrado. En `READ COMMITTED`, la consulta dentro del trigger `VOLATILE` obtiene una instantánea actual después de la espera y ve la venta confirmada. Si el borrado confirma primero, la RPC devuelve `EVENT_UNAVAILABLE`. Si la emisión se revierte, queda el caso de cero ventas. [Bloqueos](https://www.postgresql.org/docs/17/explicit-locking.html) · [Volatilidad](https://www.postgresql.org/docs/17/xfunc-volatility.html) · [Bloqueo previo al trigger](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/commands/trigger.c#L2558-L2571)

En `REPEATABLE READ` y `SERIALIZABLE`, el recuento puede usar una instantánea anterior a la venta. La cascada vigente evento → registro comprueba filas nuevas contra la instantánea original. Si el registro confirmado es invisible para esa instantánea, se espera `40001` y la reversión de todo el borrado. La cascada registro → entrada hace la misma comprobación para una entrada nueva con registro ya visible. Un borrado nuevo obtiene el conflicto con el total. Esta conclusión se deriva del código de PG17 y requiere una prueba local coordinada antes de aceptar la implementación. [Cascada FK](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/utils/adt/ri_triggers.c#L794-L802) · [Comprobación de instantáneas](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/utils/adt/ri_triggers.c#L2242-L2258) · [Ejecutor de DELETE](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/executor/nodeModifyTable.c#L1429-L1439)

**Alternativas evaluadas.** Escribir la fila del evento en cada emisión introduciría contención entre tipos. Reemplazar las FK cambiaría la semántica de las cascadas existentes.

## Mensaje en el panel

**Decisión.** Comunicar el rechazo mediante `PT409`, un identificador de dominio fijo y el total decimal en el detalle. Traducirlo en `removeEvent` y usar el aviso `aria-live` existente.

**Motivo.** PostgREST transporta código, mensaje y detalle. El panel puede validar esos campos y construir el mensaje en español. [Errores personalizados de PostgREST](https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes)

**Alternativas evaluadas.** Una nueva API o Server Action duplicaría la ruta autenticada. Depender de una frase libre del proveedor haría frágil la detección.
