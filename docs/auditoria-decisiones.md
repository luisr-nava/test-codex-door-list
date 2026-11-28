# Auditoría de decisiones de producto implícitas

Revisión estática de Door List en la revisión `0c30866`. Contrasté los flujos implementados con la documentación de producto, las fichas de reenvío y búsqueda en puerta y el historial local de Git. Incluí políticas de producto cuya elección no encontré registrada explícitamente en esas fuentes. Cada supuesto se infiere del comportamiento observable. [Contexto de producto](../PRODUCT.md) · [Reglas de negocio](business-rules.md) · [Esquema de datos](database.md) · [Notas sobre escaneo](qr-generation-and-scanning.md)

## Publicación e inventario

### 1. Un evento sin plazas sigue visible en la portada

- **Dónde vive.** La consulta pública incluye eventos según su estado y fecha. Cuando el resumen indica cero tipos disponibles, la portada conserva la tarjeta con «Registro abierto», informa que no hay entradas y quita el enlace de registro. [Consulta pública](../supabase/migrations/20261126000009_add_public_event_availability_summary.sql#L24) · [Tarjeta de evento](../app/page.tsx#L45)
- **Supuesto inferido.** La portada sirve para descubrir eventos vigentes, aunque en ese momento resulte imposible reservar una plaza.
- **Otra opción razonable.** Mantener la portada centrada en eventos reservables y dejar que el enlace directo siga mostrando el estado de agotado a quienes ya lo recibieron.

### 2. El aforo sin asignar a un tipo de entrada queda fuera del registro

- **Dónde vive.** El panel distingue aforo máximo y asignado. La disponibilidad pública se calcula con la capacidad de los tipos de entrada y el alta exige seleccionar uno con cupo. [Aforo en el panel](../app/organizador/page.tsx#L715) · [Disponibilidad pública](../supabase/migrations/20261126000009_add_public_event_availability_summary.sql#L24) · [Alta de registro](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L153)
- **Supuesto inferido.** El organizador decide cuándo ofrecer cada plaza. Por ejemplo, si configura 100 plazas de aforo y asigna 60 a un tipo, las otras 40 quedan como reserva operativa.
- **Otra opción razonable.** Permitir que el organizador ofrezca el remanente en un tipo general con capacidad calculada a partir del aforo sin asignar.

### 3. Revocar una entrada no libera su plaza

- **Dónde vive.** Tanto el resumen público como el alta cuentan filas de `registrations` para calcular el cupo, sin consultar el estado de `tickets`. El panel y el CSV, en cambio, consideran vendidas solo las entradas válidas o usadas, una regla que sí está documentada. [Disponibilidad pública](../supabase/migrations/20261126000009_add_public_event_availability_summary.sql#L24) · [Cupo al registrar](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L162) · [Entradas vendidas](../lib/export/attendees-csv.ts#L36)
- **Supuesto inferido.** La revocación retira el derecho de ingreso, pero la plaza sigue comprometida hasta que se tome una decisión aparte sobre el registro.
- **Otra opción razonable.** Definir la revocación como devolución del cupo, conservando el registro histórico y habilitando la plaza para otro asistente.

## Cambios después de emitir entradas

### 4. Cambiar la fecha o el lugar actualiza las entradas web ya emitidas

- **Dónde vive.** El organizador puede guardar cambios en los datos del evento sin una condición basada en los registros existentes. La entrada web consulta los datos actuales del evento por su código. El correo contiene la fecha y el lugar vigentes en el momento del envío, y guardar la edición no realiza otro envío. [Guardado del evento](../app/organizador/page.tsx#L190) · [Consulta de entrada](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L204) · [Correo de entrada](../lib/tickets/email.ts#L36)
- **Supuesto inferido.** La entrada web es la referencia actual. Si cambian los datos logísticos, se da por hecho que el organizador comunicará el cambio por su cuenta.
- **Otra opción razonable.** Mantener vigente la entrada y pedir al organizador que revise y confirme un aviso a los registrados al cambiar la fecha o el lugar.

### 5. El borrado definitivo sigue disponible después de emitir entradas

- **Dónde vive.** El panel ejecuta el borrado tras una confirmación general, incluso cuando hay asistentes. La cascada desde el evento elimina registros y, a partir de ellos, las entradas emitidas. [Acción de borrado](../app/organizador/page.tsx#L229) · [Relación de registros](../supabase/migrations/20261125000003_create_public_registrations.sql#L1) · [Relación de entradas](../supabase/migrations/20261126000004_create_tickets.sql#L1)
- **Supuesto inferido.** El organizador puede retirar por completo un evento, incluso cuando hay asistentes que conservan una entrada y un historial que podría necesitar consultar.
- **Otra opción razonable.** Reservar el borrado definitivo para eventos sin registros y ofrecer para los demás un estado cancelado que explique qué ocurrió al abrir la entrada y conserve el historial del organizador.

## Entrega y recuperación

### 6. Un intento de registro repetido termina en un aviso de duplicado

- **Dónde vive.** La regla documentada de un correo por evento genera `DUPLICATE_EMAIL`. El formulario muestra el aviso. La acción de reenvío está en el panel del organizador. [Detección de duplicado](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L146) · [Respuesta del formulario](../app/eventos/%5BeventId%5D/registro/registration-form.tsx#L82) · [Reenvío del organizador](features/resend-ticket.md)
- **Supuesto inferido.** Quien perdió la entrada vuelve al correo original o pide ayuda al organizador. Repetir el registro solo le advierte que ya se anotó.
- **Otra opción razonable.** Ofrecer desde el aviso que se reenvíe la entrada existente exclusivamente al correo del registro, sin emitir otra ni mostrar el código en esa pantalla.

### 7. El correo entrega un QR sin acceso directo a la entrada web

- **Dónde vive.** El éxito del registro enlaza a la entrada web. El correo contiene un QR con el código de la entrada y un texto que indica presentarlo en puerta, sin incluir el enlace a la página que muestra su estado y el código de respaldo. [Confirmación del registro](../app/eventos/%5BeventId%5D/registro/registration-form.tsx#L116) · [Contenido del correo](../lib/tickets/email.ts#L24) · [Página de entrada](../app/entradas/%5Bcode%5D/page.tsx#L50)
- **Supuesto inferido.** El correo se trata como un pase listo para mostrar y la página web como una vista que se abre en el momento de registrar.
- **Otra opción razonable.** Incluir «Ver mi entrada» también en el correo y conservar el QR embebido, de forma que el asistente pueda abrir el estado actualizado o copiar su código de respaldo desde el mismo mensaje.

### 8. El enlace de la entrada muestra el correo completo del asistente

- **Dónde vive.** La consulta por código devuelve el email de registro y la página lo muestra completo, junto al nombre y los datos del evento. El requisito documentado de acceso por enlace secreto no especifica qué datos del asistente debe incluir el pase. [Datos de la entrada](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L204) · [Datos visibles](../app/entradas/%5Bcode%5D/page.tsx#L66)
- **Supuesto inferido.** El correo sirve para que el asistente reconozca su registro y cualquier persona que pueda abrir el pase puede ver también ese dato.
- **Otra opción razonable.** Mostrar el nombre y un correo parcialmente oculto, suficiente para reconocer el registro con menos exposición cuando se comparte o se muestra el pase.

## Operación en puerta

### 9. El escáner preselecciona el evento con la fecha de inicio más tardía

- **Dónde vive.** `/scan` carga todos los eventos del propietario en orden descendente por fecha de inicio y selecciona automáticamente el primero. La fecha del día y la condición de publicado no intervienen en esa selección. [Carga y selección de eventos](../app/scan/scan-station.tsx#L42)
- **Supuesto inferido.** Reducir un paso al abrir el escáner compensa preseleccionar un evento por fecha, incluso si hay otro en curso.
- **Otra opción razonable.** Preseleccionar únicamente cuando haya un solo evento publicado para hoy y pedir una elección cuando haya varios o ninguno. El personal puede seguir seleccionando eventos de otras fechas.

### 10. El check-in tiene vigencia independiente del registro público

- **Dónde vive.** `check_in_ticket` comprueba propiedad, pertenencia y estado de la entrada. Puede registrar el ingreso de una entrada válida de un evento propio antes o después del día del evento, o si después de emitirla el organizador vuelve a borrador. La regla de registro abierto sí consulta fecha y publicación. [Validación de puerta](../supabase/migrations/20261126000010_add_ticket_check_in.sql#L18) · [Vigencia del registro público](../supabase/migrations/20261126000005_rename_ticket_tables.sql#L18)
- **Supuesto inferido.** La apertura y el cierre del acceso se delegan en el personal. La fecha pública y el estado editorial del evento no determinan cuándo se puede acreditar un ingreso.
- **Otra opción razonable.** Definir una ventana de check-in por evento, con apertura anticipada y un cierre configurable para contemplar pruebas, eventos nocturnos y entradas tardías.

### 11. La confirmación previa depende de cómo se identificó la entrada

- **Dónde vive.** Leer un QR llama al check-in directamente. El envío del código manual también lo ejecuta. En la búsqueda por email, el operador ve primero la identidad y el tipo de entrada y luego pulsa «Confirmar ingreso». Las fichas describen ambos flujos, sin explicar por qué la confirmación cambia entre ellos. [Lectura de QR](../app/scan/scan-station.tsx#L169) · [Ingreso manual y búsqueda](../app/scan/scan-station.tsx#L237)
- **Supuesto inferido.** Presentar la entrada física o digital expresa intención de ingresar y permite validar con un paso. Dictar un email identifica a una persona y requiere una confirmación posterior del operador.
- **Otra opción razonable.** Mantener el check-in directo por cámara y mostrar nombre y tipo de entrada antes de confirmar un código transcrito manualmente, igual que en la búsqueda por email.

## Lectura del panel

### 12. La gráfica mide altas históricas, incluidas las de entradas revocadas

- **Dónde vive.** La serie diaria agrupa por fecha de alta de `registrations` sin filtrar por estado de la entrada. El indicador «entradas vendidas» usa el conjunto de entradas válidas o usadas. [Serie diaria](../app/api/events/%5BeventId%5D/daily-registrations/route.ts#L33) · [Datos de la serie](../app/api/events/%5BeventId%5D/daily-registrations/route.ts#L78) · [Filtro de entradas vendidas](../lib/export/attendees-csv.ts#L36)
- **Supuesto inferido.** La gráfica responde cuántas personas se anotaron cada día, incluso si después dejaron de tener derecho a ingresar. El contador de ventas responde cuántas entradas mantienen vigencia o ya se usaron.
- **Otra opción razonable.** Ofrecer dos series etiquetadas, altas históricas y registros con entrada válida o usada, para que el organizador pueda consultar demanda y ocupación con el mismo rango de fechas.

### 13. La gráfica sigue añadiendo días después del cierre del registro

- **Dónde vive.** La serie rellena con ceros cada día desde `published_at` hasta hoy, sin usar la fecha del evento como límite. La fecha de la última publicación como punto de inicio figura en la documentación. [Rango de la serie diaria](../app/api/events/%5BeventId%5D/daily-registrations/route.ts#L39) · [Fecha de publicación](database.md#tablas-y-relaciones)
- **Supuesto inferido.** El panel funciona como un seguimiento hasta el día de la consulta, incluso cuando el evento ya no admite registros.
- **Otra opción razonable.** Cerrar la serie al terminar el periodo de inscripción para que un evento finalizado conserve la misma gráfica histórica con el paso del tiempo.
