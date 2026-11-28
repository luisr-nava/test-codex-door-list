# Contrato de eliminación de eventos

El panel continúa enviando `DELETE` al recurso `events` de Supabase PostgREST, filtrado por ID y con la sesión del organizador. PostgreSQL decide el resultado para cualquier `DELETE` que alcance la fila del Event, incluidos borrados directos en SQL y cascadas desde `auth.users`.

| Resultado | Contrato |
|---|---|
| Propietario autorizado, cero ventas | El `DELETE` del panel solicita el retorno de `id`. Si devuelve el ID eliminado, el panel recarga el listado, actualiza la selección si corresponde y muestra «Evento eliminado.». |
| Una o más ventas en el momento del borrado | SQLSTATE `PT409`, mensaje de dominio `EVENT_HAS_SOLD_TICKETS` y `DETAIL` con el total decimal positivo. PostgREST responde HTTP 409 con `code`, `message`, `details` y `hint` en su formato vigente. |
| Cero filas afectadas | Tanto para un evento ausente como para uno oculto por RLS, el panel recarga el listado y muestra «No se pudo eliminar el evento. Puede que ya no esté disponible.». |
| Otro error o detalle inválido | El panel aplica el manejo previsto para errores existentes, con mensaje genérico cuando corresponda. Una transacción SQL con instantánea antigua puede recibir `40001` y debe comenzar una transacción nueva para reintentar. |

## Mensaje al organizador

El panel reconoce juntos `PT409` y `EVENT_HAS_SOLD_TICKETS`, y valida que `details` sea el decimal de un entero positivo seguro. La región `aria-live="polite"` permanece montada y anuncia el resultado completo sin mover el foco. Mientras el borrado está pendiente, los controles del evento muestran «Eliminando…» y están deshabilitados.

- **1 venta** — «No se puede eliminar el evento porque ya tiene 1 entrada vendida»
- **2 o más ventas** — «No se puede eliminar el evento porque ya tiene {total} entradas vendidas»

El panel genera estos textos en español. El cuerpo de error de PostgREST contiene solo el identificador de dominio y el recuento de ventas para este caso.
