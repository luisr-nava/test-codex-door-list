# Plan de implementación: Protección de eventos con entradas vendidas

**Rama** `002-protect-sold-events` · **Fecha** 2026-11-28 · **Entrada** [Especificación](spec.md)

## Resumen

PostgreSQL rechazará el borrado de un evento con al menos una entrada emitida. El borrado esperará el bloqueo de emisión que ya toma `create_public_registration`. Si hay ventas, el mismo recuento que decide el rechazo llegará al panel para mostrar el mensaje singular o plural. El alcance es el borrado del evento y la integridad de sus datos.

## Contexto técnico

| Aspecto | Contexto |
|---|---|
| Lenguajes y plataforma | TypeScript estricto y SQL/PLpgSQL. Aplicación web Next.js App Router 16.4.6, React 19.3.1 y Tailwind CSS 4.3.5 según las dependencias declaradas. |
| Persistencia y autenticación | Supabase Auth, PostgREST, PostgreSQL 17 local y RLS. El panel usa Supabase JS con la sesión del organizador. |
| Emisión | `create_public_registration` inserta registro y entrada en una transacción. La API pública envía el correo por Resend después de la emisión. |
| Pruebas | Playwright existente, pruebas SQL contra Supabase local y dos sesiones SQL coordinadas para concurrencia. Node test y TypeScript para regresión. |
| Rendimiento | El recuento usa los índices existentes por evento y registro. La emisión conserva su orden y granularidad de bloqueo. La spec no fija un objetivo de latencia. |
| Alcance | Una migración nueva, un ajuste de manejo de errores en el panel y pruebas. Server Components por defecto para código nuevo de interfaz. Se conserva el componente cliente existente por su sesión local, estado y confirmación de navegador. |

## Constitución

**Antes de la investigación.** El principio I exige especificar la protección y agregar una migración. El principio V aplica a la conservación de entradas revocadas. FR-007 exige comprobar que el control de borrado conserva el aforo y la emisión durante el registro, además de los permisos de eliminación.

**Después del diseño.** La revisión de la Feature 002 cubre la protección del borrado y sus regresiones. El trigger conserva las entradas revocadas tras el rechazo, y la migración reutiliza las FK y RLS existentes. La guía verifica el aforo con valores numéricos y el flujo de emisión con las respuestas vigentes.

**Discrepancia vigente para revisión separada.** El principio IV exige al menos un tipo con cupo disponible al publicar. La migración `20261125000002_allow_selected_event_status.sql` permite publicar sin tipos. La revisión de la regla de publicación queda pendiente para una especificación separada. El calendario y la exportación de auditoría también tienen discrepancias preexistentes con los principios II y V, respectivamente. [Esquema de referencia](../../docs/database.md) · [Reglas de negocio](../../docs/business-rules.md)

## Estado frente a la especificación

| Estado | Criterio | Evidencia actual y trabajo previsto |
|---|---|---|
| Cumplido | FR-001, historia 3.1 y caso 0 de SC-001 | `removeEvent` ejecuta el borrado directo en `events`. RLS permite borrar al propietario y las cascadas quitan los hijos del evento sin ventas. Mantener y probar. |
| Cumplido | FR-004 cuando gana el borrado, historia 3.2 y parte de SC-003 | El registro pide `FOR SHARE` sobre el evento y devuelve `EVENT_UNAVAILABLE` si ya se eliminó. Añadir prueba determinista. |
| Cumplido | FR-007 | El aforo y la emisión durante el registro, y los permisos de borrado, ya existen. Verificar que la protección del borrado los preserva según [base de datos](../../docs/database.md) y [reglas de negocio](../../docs/business-rules.md). |
| Requiere cambios | FR-002/003/005, historia 1 y casos 1 y 3 de SC-001, SC-002 | Hoy el borrado puede activar las cascadas y perder entradas emitidas. Agregar el trigger de fila antes de la cascada y probar que las cuatro entidades quedan intactas. |
| Requiere cambios | FR-006, historias 1.1/1.2/1.5 y SC-004 | El panel tiene aviso de error genérico, excepción de aforo y aviso de éxito. Incorporar el conflicto de ventas con cantidad y concordancia exactas. |
| Nuevo | FR-004 cuando gana la emisión, historia 2.1 y parte de SC-003 | El bloqueo vigente espera a que termine el registro. El trigger añadirá la decisión con el recuento posterior a esa espera. |
| Nuevo | Casos límite de FR-002 | La protección cuenta entradas usadas y revocadas y excluye registros sin emisión. Los tipos sin ventas aportan cero. |

## Estructura del proyecto

- `supabase/migrations/` recibe una migración posterior a `20261126000010_add_ticket_check_in.sql`. Ahí van la función interna, el trigger y los privilegios de la función. Se preserva el historial de migraciones.
- `app/organizador/page.tsx` conserva `removeEvent`, la confirmación, el cliente autenticado y el aviso con `aria-live`. Se agrega la traducción del rechazo en esa operación.
- `lib/registrations/data.ts` y `app/api/events/[eventId]/register/route.ts` son puntos de referencia para probar la emisión y `EVENT_UNAVAILABLE`.
- `tests/e2e/registration-flow.spec.ts` y `tests/e2e/README.md` se ajustan a la protección. Los escenarios SQL pueden vivir en `tests/db/` y reutilizar el PostgreSQL del entorno local.
- `docs/database.md` y `docs/business-rules.md` incorporarán el comportamiento tras la implementación.

## Fase 0 · Investigación

La cadena vigente y la justificación de los bloqueos, las instantáneas y el error tipado están en [research.md](research.md). La función solicitada como `register_for_event` corresponde en este repositorio a `create_public_registration`.

## Fase 1 · Diseño

1. En una sola migración, crear una función de trigger interna `VOLATILE` y un trigger por fila `BEFORE DELETE` en `public.events`. Consultar `tickets` por `registrations.event_id` después de adquirir el bloqueo de borrado. Si el total es positivo, fallar antes de las cascadas.
2. Mantener la llamada autenticada de `removeEvent`. Reconocer el código y el identificador de dominio y validar el total. Mostrar el aviso existente en español y conservar el evento seleccionado en caso de error. Dejar el resto de fallos en el manejo actual.
3. Verificar con [la guía de validación](quickstart.md) todas las historias, criterios y regresiones. Los criterios de salida incluyen el mensaje del panel cuando la emisión gana la carrera y la reversión del borrado con una instantánea anterior a la venta en PostgreSQL 17.

Artefactos de diseño: [modelo de datos](data-model.md), [contrato de eliminación](contracts/event-deletion.md) y [guía de validación](quickstart.md).
