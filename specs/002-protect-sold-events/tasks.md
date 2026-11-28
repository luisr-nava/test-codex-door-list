# Tareas de implementación: Protección de eventos con entradas vendidas

**Entrada** [Especificación](spec.md) · [Plan](plan.md) · [Investigación](research.md) · [Modelo de datos](data-model.md) · [Contrato](contracts/event-deletion.md) · [Validación](quickstart.md).

**Formato** `- [ ] TNNN [P?] [USN?] Descripción con ruta`. `[P]` identifica trabajo simultáneo en archivos distintos con las dependencias previas satisfechas. Las pruebas se escriben antes del cambio de producto en cada historia. Los casos nuevos deben detectar el comportamiento anterior. Los casos de regresión deben conservar su resultado.

## Fase 1 · Preparación

- [X] T001 Preparar la instancia local desechable de PostgreSQL 17 según `supabase/config.jsonc` y `specs/002-protect-sold-events/quickstart.md`. Comprobar el runner de `scripts/run-e2e.mjs`, los comandos existentes de `package.json` y el acceso local mediante dos sesiones SQL y una observadora. Ejecutar operaciones de base de datos con la aprobación requerida por el repositorio.

## Fase 2 · Base común

- [X] T002 Crear `tests/db/event-deletion-fixtures.sql` con datos de prueba aislados por ejecución, dos organizadores, eventos con tipos y emisiones por la RPC vigente. Preparar las variantes con estados usado y revocado y el registro sin Ticket. Identificar los datos por ID y limitar su limpieza al entorno local de prueba.

## Fase 3 · US1 · Proteger eventos con ventas (P1)

**Objetivo** Rechazar la eliminación desde cualquier ruta autorizada, conservar los datos y mostrar el recuento exacto al organizador.

**Prueba independiente** Intentar borrar eventos con una venta, tres ventas de dos tipos, y una única entrada revocada. Verificar rechazo, mensajes exactos y persistencia de los datos. Repetir el borrado fuera del panel.

### Pruebas de US1

- [X] T003 [P] [US1] Crear `tests/e2e/event-deletion-contract.spec.ts` para probar PostgREST directamente con la sesión del propietario. Verificar HTTP 409, `PT409`, `EVENT_HAS_SOLD_TICKETS` y detalle exacto para una y tres ventas conforme a [event-deletion.md](contracts/event-deletion.md).
- [X] T004 [P] [US1] Crear `tests/db/sold-event-deletion.test.sql` para probar el DELETE del propietario autenticado y la cascada desde `auth.users`. Comparar antes y después Event, TicketType, Registration y Ticket. Incluir 1 General, 2 VIP y un tipo sin ventas en el caso de tres ventas, y casos con una única entrada usada o revocada.
- [X] T005 [P] [US1] Crear `tests/e2e/event-deletion.spec.ts` para comprobar desde el panel los textos exactos de una y tres ventas y de una única venta revocada. Confirmar el diálogo y verificar que el evento permanece visible tras el rechazo. Comprobar el mensaje genérico ante un detalle de conflicto inválido sin presentar el texto crudo del proveedor.
- [X] T006 [P] [US1] Actualizar `tests/e2e/registration-flow.spec.ts` para comprobar el rechazo tras el check-in y que la entrada sigue usada. Mover la aserción al cuerpo de la prueba y hacer que el cierre del receptor de correo y la limpieza local de la fixture se ejecuten aun si falla una aserción.

### Implementación de US1

- [X] T007 [P] [US1] Agregar `supabase/migrations/20261128000001_protect_sold_events.sql` con la función interna `VOLATILE SECURITY DEFINER`, `search_path` vacío, relaciones calificadas, `EXECUTE` revocado explícitamente a `PUBLIC`, `anon` y `authenticated` y trigger `BEFORE DELETE FOR EACH ROW` en `public.events`. Contar las entradas a través de los registros y emitir el conflicto contratado antes de las cascadas. Aplicar las definiciones de [data-model.md](data-model.md) para `Event.id`, `Registration.id`, `Registration.event_id`, `Ticket.id`, `Ticket.registration_id` y `Ticket.status`. Preservar las restricciones vigentes de [data-model.md](data-model.md) para `Event.owner_id`, `TicketType.id`, `TicketType.event_id`, `Registration.ticket_type_id` y `Registration.email`.
- [X] T008 [P] [US1] Adaptar `removeEvent` en `app/organizador/page.tsx` al [contrato](contracts/event-deletion.md). Validar código, identificador y total decimal positivo seguro. Mostrar el texto singular o plural en el aviso `aria-live` y conservar el manejo de otros errores, el estado del formulario y la ruta de borrado autenticado.
- [X] T009 [US1] Aplicar la migración nueva en Supabase local según `specs/002-protect-sold-events/quickstart.md`. Ejecutar `tests/db/sold-event-deletion.test.sql` y las pruebas Playwright de T003, T005 y T006 para validar FR-002, FR-003, FR-005 y FR-006.

## Fase 4 · US2 · Proteger una venta simultánea (P1)

**Objetivo** Conservar la primera entrada si la emisión se confirma antes que el borrado.

**Prueba independiente** Con cero ventas confirmadas, mantener abierta la transacción de emisión, iniciar el borrado, observar que espera al registro y confirmar la emisión. Verificar el rechazo con total 1 y la conservación de evento y entrada.

- [X] T010 [US2] Crear `tests/db/event-deletion-concurrency.test.mjs` con sesiones `psql` locales coordinadas mediante Node y una conexión observadora. Probar emisión primero en `READ COMMITTED`, esperar el bloqueo mediante `pg_blocking_pids` con plazo acotado, confirmar y verificar `PT409` con total 1 y las filas intactas. Agregar en `tests/e2e/event-deletion-concurrency.spec.ts` la misma carrera usando el borrado real del panel con la sesión del propietario. Confirmar la emisión después de observar el bloqueo de la solicitud PostgREST. Afirmar el HTTP 409, el texto singular exacto y la persistencia del evento y la entrada.
- [X] T011 [US2] Añadir a `tests/db/event-deletion-concurrency.test.mjs` instantáneas anteriores a la venta en `REPEATABLE READ` y `SERIALIZABLE`. Verificar `40001`, reversión completa y `PT409` con total 1 en una transacción nueva.
- [X] T012 [US2] Ejecutar las pruebas SQL y Playwright de T010 y T011 contra `supabase/migrations/20261128000001_protect_sold_events.sql` según `specs/002-protect-sold-events/quickstart.md`. Verificar que el trigger se beneficia del orden de bloqueos de la RPC y las FK vigentes. Si el resultado difiere, resolver el hallazgo antes de cerrar SC-003 y conservar las reglas de emisión.

## Fase 5 · US3 · Eliminar eventos sin ventas (P2)

**Objetivo** Mantener el flujo habitual de eliminación con cero entradas emitidas e impedir la emisión posterior a un borrado confirmado.

**Prueba independiente** Borrar un evento propio con cero ventas desde el panel. En otra fixture, confirmar el borrado antes que el registro concurrente y comprobar cero ventas posteriores.

- [X] T013 [P] [US3] Agregar a `tests/e2e/event-deletion.spec.ts` un evento propio con cero ventas. Confirmar el diálogo, verificar el aviso «Evento eliminado.» y comprobar que la tarjeta desaparece del listado y permanece ausente al recargar.
- [X] T014 [P] [US3] Crear `tests/db/unsold-event-deletion.test.sql` para comprobar que un registro sin Ticket aporta cero ventas y que se eliminan el evento, los tipos y el registro mediante las cascadas vigentes.
- [X] T015 [US3] Ampliar `tests/db/event-deletion-concurrency.test.mjs` con dos casos en `READ COMMITTED`. Si el borrado confirma primero, comprobar `EVENT_UNAVAILABLE` en la RPC y ausencia de filas de la fixture. Si la emisión abierta se revierte, comprobar que el borrado pendiente se completa con cero ventas.
- [X] T016 [US3] Ejecutar T013 a T015 según `specs/002-protect-sold-events/quickstart.md`. Confirmar que `app/organizador/page.tsx` mantiene la ruta de éxito y que `app/api/events/[eventId]/register/route.ts` conserva HTTP 404 para `EVENT_UNAVAILABLE`.

## Fase 6 · Regresiones, documentación y cierre

- [X] T017 [P] Crear `tests/db/event-deletion-regressions.test.sql` para verificar que la sesión anónima y el organizador ajeno no pueden borrar ni obtener el recuento. Verificar la ausencia de `EXECUTE` efectivo en `anon` y `authenticated` y de una concesión de `EXECUTE` a `PUBLIC` en la ACL de la función interna. Probar aforo 3 con General 1 y VIP 2, rechazo por exceso de aforo y reducción bajo el consumo, duplicado de email normalizado, entrada agotada, solicitud inválida y evento no disponible. Comparar con `docs/database.md` y `docs/business-rules.md`.
- [X] T018 [P] Actualizar `docs/database.md`, `docs/business-rules.md` y `tests/e2e/README.md` después de validar el comportamiento. Documentar alcance del recuento, el rechazo, las pruebas SQL y el desmontaje local de las fixtures.
- [X] T019 Ejecutar los casos de `specs/002-protect-sold-events/quickstart.md`, las pruebas SQL, `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run test:e2e` definidos en `package.json`. Verificar FR-001 a FR-007 y SC-001 a SC-004, incluida la regresión de CSV en `tests/attendees-export.test.mjs` y que el historial de `supabase/migrations/` conserva sus archivos aplicados.

## Fase 7 · Correcciones de la revisión

- [X] T020 [US3] Cubrir la tarjeta desactualizada en `tests/e2e/event-deletion.spec.ts` y confirmar el borrado por ID devuelto en `app/organizador/page.tsx`. Recargar y mostrar el aviso establecido si el DELETE afecta cero filas.
- [X] T021 [US2] Mantener montada la región de estado, anunciar el resultado sin mover el foco y mostrar «Eliminando…» en los controles del evento en curso en `app/organizador/page.tsx`. Verificar el estado pendiente, el aviso y su repetición en `tests/e2e/event-deletion-concurrency.spec.ts`.
- [X] T022 Revalidar TypeScript, Playwright y las suites SQL de integridad y concurrencia según `specs/002-protect-sold-events/quickstart.md`. Registrar la comprobación manual del anuncio con un lector de pantalla cuando esté disponible.

## Dependencias y orden de ejecución

```text
T001 → T002
T002 → US1 (T003–T006 → T007/T008 → T009)
T002 → US2 (T010 → T011) → T012 tras T009
T002 → T014 (US3)
T005 → T013 (US3, comparten el archivo de Playwright)
T011 → T015 (US3, comparten el archivo de concurrencia)
T009 + T013 + T014 + T015 → T016
T009 + T012 + T016 → T017/T018 → T019
T019 → T020 → T021 → T022
```

US2 y US3 reutilizan la implementación de US1. Cada una tiene su propio criterio de prueba y ambas se verifican con la misma migración. El orden de ejecución de pruebas puede variar si se usan fixtures y sesiones aisladas.

## Ejemplos de ejecución en paralelo

- **US1** — Escribir T003, T004, T005 y T006 en archivos distintos. Después, trabajar simultáneamente en la migración T007 y el panel T008.
- **US2** — Preparar T010 y T011 en orden mientras se trabaja en T007 y T008. Ejecutar T012 tras aplicar la migración.
- **US3** — Preparar T014 mientras se escribe T010. Agregar T013 después de T005, pues modifican el mismo archivo. Agregar T015 después de T011 por la misma razón.
- **Cierre** — Preparar la prueba de regresión T017 y actualizar la documentación T018 en paralelo, con los resultados de las historias disponibles.

## Estrategia de implementación

1. Completar la preparación y las fixtures comunes.
2. Validar US1 como MVP funcional con el trigger y el aviso del panel.
3. Verificar US2 y US3 antes de considerar lista la Feature 002. La concurrencia en ambos órdenes y el borrado con cero ventas son criterios de entrega.
4. Cerrar con las regresiones y la actualización de la documentación.
