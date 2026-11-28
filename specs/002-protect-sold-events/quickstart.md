# Validación de la Feature 002

## Preparar el entorno local

Desde la raíz, con las dependencias y Chromium de Playwright disponibles, iniciar Supabase local y aplicar la nueva migración en una instancia de prueba. Usar dos organizadores y datos ficticios con identificadores únicos por ejecución. El [runner actual](../../tests/e2e/README.md) prepara la sesión de prueba y usa un receptor de correo local.

```powershell
npx.cmd supabase start
npx.cmd supabase migration up --local
npm.cmd run lint
npm.cmd test
node tests/db/run-event-deletion.mjs
node --test tests/db/event-deletion-concurrency.test.mjs
npm.cmd run test:e2e
```

Las pruebas SQL automatizadas usan el `psql` del contenedor local `supabase_db_door-list` mediante el contexto `default` de Docker. El runner de concurrencia abre dos sesiones de trabajo y una observadora. Cada escenario usa un evento propio y comprueba el estado final desde una transacción nueva.

## Matriz de aceptación

| Caso | Ejecución | Resultado esperado |
|---|---|---|
| Cero ventas · historia 3.1, FR-001, SC-001 | El propietario confirma el diálogo del panel sobre un evento con dos tipos y cero entradas emitidas. Repetir en SQL con un registro de fixture sin Ticket. | Aviso «Evento eliminado.», evento ausente y cascadas completas sobre tipos y registros. |
| Una venta · historia 1.1, FR-002/006, SC-001/004 | Registrar una entrada General y confirmar el borrado desde el panel. | Conflicto HTTP 409, texto singular exacto, evento visible. |
| Tres ventas · historia 1.2, FR-002/006, SC-001/004 | Confirmar 1 General y 2 VIP y dejar un tercer tipo sin ventas. Intentar eliminar desde el panel. | HTTP 409, total 3 y texto plural exacto. |
| Rutas alternativas · historia 1.3, FR-003, SC-001 | Ejecutar `DELETE` por SQL como propietario autenticado con su identidad de sesión y repetir por PostgREST sin UI con el equivalente JWT. Probar también la cascada desde un usuario de Auth de prueba que posea un evento vendido. | Conflicto de dominio con el recuento en cada vía autorizada. El usuario de la prueba de cascada conserva su fila. |
| Integridad · historia 1.4, FR-005, SC-002 | Guardar el contenido de Event, TicketType, Registration y Ticket antes de cada rechazo por ventas y comparar con las filas posteriores. | Coinciden IDs, valores, asociaciones, estados, códigos y marcas de tiempo. |
| Entrada usada o revocada · historia 1.5, FR-002/005, SC-002 | Tras el check-in existente, intentar borrar el evento con su única entrada usada. Repetir con una fixture cuya única entrada se marcó `revoke`. | Ambas operaciones se rechazan con total 1 y cada estado se conserva. |
| Venta simultánea · historia 2.1, FR-004/006, SC-003 | Ejecutar la secuencia de emisión primero por SQL y repetir el borrado desde el panel con la sesión del propietario. Ejecutar también el caso con instantánea antigua. | El evento y la primera entrada sobreviven. El panel recibe HTTP 409 y muestra el texto singular exacto. |
| Eliminación simultánea · historia 3.2, FR-004, SC-003 | Ejecutar la secuencia de borrado primero. | El evento desaparece y se confirman cero ventas posteriores para él. |

Usar los textos y códigos del [contrato](contracts/event-deletion.md) como expectativas literales. El caso E2E de check-in verifica el rechazo a eliminar el evento y confirma que la entrada sigue usada. La limpieza elimina los datos hijos de cada fixture antes de borrar el evento en la base local. La prueba siempre cierra el receptor de correo.

## Concurrencia con dos conexiones

En los casos de `READ COMMITTED`, registrar los PID de A y B. Mantener abierta la transacción que llegó primero al evento. Desde la sesión observadora, esperar con un plazo acotado a que `pg_blocking_pids` muestre que B espera a A. Solo entonces confirmar o revertir A, según el caso. En el caso de instantánea antigua, A fija su instantánea, B confirma la venta y recién entonces A inicia el borrado. El criterio de ese caso es la reversión por `40001`.

| Secuencia | Conexión A | Conexión B | Verificación tras terminar |
|---|---|---|---|
| Emisión primero · `READ COMMITTED` | Iniciar transacción, llamar a `create_public_registration` y obtener `SUCCESS`. Mantener abierta la transacción. | Iniciar el borrado de ese evento de cero ventas confirmadas. Espera a A. | A confirma. B recibe `PT409` con total 1 y revierte. Comparar el evento y la entrada emitida en una nueva transacción. |
| Borrado primero · `READ COMMITTED` | Borrar un evento de cero ventas y mantener abierta la transacción. | Llamar a la RPC para el mismo evento. Espera a A. | A confirma. B obtiene `EVENT_UNAVAILABLE`. La API pública conserva HTTP 404 para ese resultado. Verificar ausencia de evento, registros y entradas para la fixture. |
| Emisión revertida · `READ COMMITTED` | Llamar a la RPC y mantener abierta la transacción. | Iniciar borrado y esperar a A. | A revierte. B completa el borrado con cero ventas. |
| Instantánea antigua · `REPEATABLE READ` y `SERIALIZABLE` | Establecer la instantánea de la transacción leyendo el evento con cero ventas. Tras la confirmación de B, intentar borrarlo. | Confirmar una entrada mediante la RPC. | A recibe `40001` y revierte. El evento y la entrada persisten. Un borrado en una nueva transacción recibe `PT409` con total 1. |

Para la variante de Playwright con emisión primero, mantener la venta sin confirmar en A y accionar el borrado real desde el panel autenticado. Antes de confirmar A, la conexión observadora debe detectar que la sesión de PostgreSQL de la solicitud PostgREST está bloqueada por A. Verificar el HTTP 409, el texto singular del [contrato](contracts/event-deletion.md) y la persistencia del evento y la entrada.

## Correcciones del panel · FR-001, FR-006 y FR-008

- Mantener abierta la tarjeta de un evento borrado en otra sesión y confirmar el borrado desde la tarjeta. Verificar el aviso de cero filas y el listado actualizado.
- Durante el bloqueo de la prueba de venta concurrente, verificar «Eliminando…» en los controles del evento y la región de estado ya montada. Tras el rechazo, verificar el mensaje y la recuperación de las etiquetas. Repetir el intento con lector de pantalla para comprobar el anuncio sin desplazar el foco. Playwright comprueba la región de estado y su actualización en ambos intentos. Queda pendiente escuchar o revisar la transcripción de ambos anuncios.

## Regresiones · FR-007

- Verificar que un organizador ajeno y una sesión anónima no pueden borrar, ni obtener el recuento del evento, aun cuando esté publicado. Comprobar los privilegios efectivos de `anon` y `authenticated` sobre la función de trigger y la ausencia de una concesión de `EXECUTE` a `PUBLIC`.
- Con aforo del evento de 3 y tipos General de 1 y VIP de 2, confirmar 3 entradas con emails distintos. Un segundo General y un tercer VIP devuelven `TICKET_UNAVAILABLE`. Rechazar que la capacidad asignada supere 3 o que el límite de VIP baje de 2 tras dos confirmaciones.
- Verificar un único registro y entrada por email normalizado para el evento, con `DUPLICATE_EMAIL` en un nuevo intento. Conservar `INVALID_INPUT` ante una solicitud inválida y `EVENT_UNAVAILABLE` para un evento no disponible. En los rechazos no se emiten entradas. Comprobar que los códigos HTTP vigentes coinciden con los del contrato de registro actual.
- Ejecutar el flujo E2E vigente de registro, QR, correo simulado y check-in. Ejecutar las pruebas de CSV para conservar sus reglas de recuento, incluida la exclusión de revocadas de esa exportación.
