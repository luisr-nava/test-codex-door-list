# Modelo de datos de la Feature 002

| Entidad | Persistencia y relaciones |
|---|---|
| Event | `public.events.id` identifica el evento. `owner_id` referencia `auth.users.id` con cascada de borrado. La política de borrado permite al propietario autenticado actuar sobre su evento. |
| TicketType | `public.ticket_types.id` identifica el tipo. `event_id` referencia el evento con cascada. El par `(id, event_id)` identifica el tipo dentro de su evento para la FK de Registration. |
| Registration | `public.registrations.id` identifica el registro. `event_id` referencia el evento con cascada. `(ticket_type_id, event_id)` referencia el tipo del mismo evento con `ON DELETE NO ACTION`. La lógica vigente limita el email normalizado a un registro por evento. |
| Ticket | `public.tickets.id` identifica la entrada emitida. `registration_id` es único y referencia el registro con cascada. Su estado es `valid`, `used` o `revoke`. |

## Reglas y transiciones

- Una venta confirmada equivale a una fila de Ticket emitida y vinculada al evento mediante Registration. Cada Ticket contribuye una unidad con cualquiera de los tres estados. Un Registration sin Ticket aporta cero, también para datos históricos anteriores a la emisión de entradas.
- La confirmación pública crea Registration y Ticket en una transacción. El recuento es derivado. El diseño agrega el trigger de borrado a Event y reutiliza columnas, relaciones e índices existentes.
- Un borrado autorizado con cero ventas elimina el Event y aplica sus cascadas vigentes. Un borrado rechazado deja intactos Event, TicketType, Registration y Ticket, incluidos códigos, estados y marcas de tiempo.
- El estado de Ticket puede cambiar por los flujos vigentes. Un cambio de estado no altera su contribución al recuento de borrado.

[Esquema de referencia](../../docs/database.md) · [Reglas vigentes](../../docs/business-rules.md) · [Contrato de eliminación](contracts/event-deletion.md)
