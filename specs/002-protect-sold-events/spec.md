# Feature Specification: Protección de eventos con entradas vendidas

**Feature Branch**: `main` (rama de trabajo al redactar la especificación)

**Created**: 2026-11-28

**Status**: Draft

**Input**: Feature 002. Proteger los eventos con ventas confirmadas y explicar al organizador por qué se rechaza su eliminación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proteger eventos con ventas (Priority: P1)

Como organizador, quiero que el sistema impida eliminar un evento con entradas vendidas y me indique cuántas se vendieron, para conservar el evento y las entradas de sus asistentes.

**Why this priority**: Eliminar un evento con ventas confirmadas pone en riesgo las entradas que ya obtuvieron sus asistentes.

**Independent Test**: Intentar eliminar eventos con 1 y 3 entradas vendidas y verificar el rechazo, el recuento mostrado y la conservación del evento y sus entradas.

**Acceptance Scenarios**:

1. **Dado** un evento con 1 entrada vendida, **cuando** el organizador intenta eliminarlo, **entonces** la eliminación se rechaza y el organizador ve el mensaje «No se puede eliminar el evento porque ya tiene 1 entrada vendida».
2. **Dado** un evento con 3 entradas vendidas, 1 General y 2 VIP, **cuando** el organizador intenta eliminarlo, **entonces** la eliminación se rechaza y el organizador ve el mensaje «No se puede eliminar el evento porque ya tiene 3 entradas vendidas».
3. **Dado** un evento con al menos 1 entrada vendida, **cuando** se intenta eliminar por una vía distinta de la pantalla del panel, **entonces** la misma regla rechaza la eliminación.
4. **Dado** un intento de eliminación rechazado por ventas, **cuando** se consulta el evento y sus entradas, **entonces** el evento sigue existiendo y ninguno de sus datos ni de los de sus entradas fue modificado por el intento.
5. **Dado** un evento cuya única entrada vendida fue revocada, **cuando** el organizador intenta eliminarlo, **entonces** se rechaza la eliminación, el mensaje informa 1 entrada vendida y la entrada conserva su estado de revocación.

---

### User Story 2 - Proteger una venta simultánea (Priority: P1)

Como asistente, quiero que mi entrada confirmada se conserve si el organizador intenta eliminar el evento mientras me registro.

**Why this priority**: Una venta confirmada durante el intento de eliminación debe dar la misma protección que una venta previa.

**Independent Test**: Iniciar la eliminación de un evento con 0 ventas y confirmar su primera venta antes de que la eliminación se concrete.

**Acceptance Scenarios**:

1. **Dado** un evento con 0 entradas vendidas al iniciar la eliminación, **cuando** se confirma 1 venta antes de que la eliminación se concrete, **entonces** la eliminación se rechaza, el evento y su entrada se conservan y el mensaje al organizador informa 1 entrada vendida.

---

### User Story 3 - Eliminar eventos sin ventas (Priority: P2)

Como organizador, quiero poder eliminar un evento sin ventas confirmadas mediante el flujo habitual.

**Why this priority**: La protección debe permitir que el organizador siga retirando eventos sin ventas.

**Independent Test**: Eliminar un evento propio con 0 entradas vendidas y verificar que se eliminó.

**Acceptance Scenarios**:

1. **Dado** un evento propio con 0 entradas vendidas y que cumple las demás condiciones de eliminación, **cuando** el organizador lo elimina, **entonces** la eliminación se completa mediante el flujo habitual.
2. **Dado** un evento con 0 entradas vendidas y un registro en curso, **cuando** la eliminación se completa antes de que se confirme la venta, **entonces** el evento queda eliminado y ese registro no puede terminar con una entrada vendida para el evento eliminado.

---

### Edge Cases

- Una entrada confirmada y luego usada o revocada sigue contando como venta confirmada para esta protección. Un evento cuya única venta fue revocada sigue protegido y conserva la entrada con su estado de revocación.
- Un registro pendiente por sí solo no suma entradas vendidas. Si todavía no se confirmó ninguna venta al concretarse la eliminación, se aplica el caso de 0 ventas.
- Los tipos con 0 ventas aportan 0 al total. Las ventas de cualquier otro tipo conservan la misma protección.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** — Permitir eliminar mediante el flujo habitual un evento con 0 entradas vendidas si el solicitante está autorizado y se cumplen las demás condiciones de eliminación.
- **FR-002** — Rechazar la eliminación si el evento tiene al menos 1 entrada vendida en el momento de concretar la operación. El total debe sumar las entradas de todos sus tipos, con una unidad por cada venta confirmada, aunque la entrada se haya usado o revocado.
- **FR-003** — Aplicar la protección a todo intento de eliminación, cualquiera sea su origen.
- **FR-004** — Si una venta se confirma antes de que la eliminación se concrete, incluirla en el total utilizado para decidir el resultado. Si la eliminación se concreta primero, ningún registro en curso puede concluir después con una venta confirmada para ese evento.
- **FR-005** — Al rechazar la eliminación por ventas, conservar intactos el evento y todas sus entradas.
- **FR-006** — Al rechazar la eliminación por ventas, informar al organizador en español que el evento no puede eliminarse porque ya tiene entradas vendidas. El mensaje debe indicar el total exacto que motivó el rechazo y usar singular para 1 entrada y plural a partir de 2.
- **FR-007** — Mantener el flujo de venta, las reglas de aforo de la Feature 001 y los permisos de eliminación vigentes. El recuento de esta protección se aplica a la decisión de eliminar y al mensaje asociado.

### Key Entities *(include if feature involves data)*

- **Evento** — Elemento cuya eliminación depende del total de ventas confirmadas.
- **Entrada** — Credencial individual asociada a un evento y un tipo de entrada. Una entrada cuenta para la protección cuando su venta se confirma.
- **Tipo de entrada** — Categoría de una entrada dentro del evento, como General o VIP. Todas las categorías aportan al mismo total para decidir si el evento puede eliminarse.
- **Registro** — Solicitud del asistente que puede culminar en una venta confirmada. Mientras esté pendiente, no suma entradas vendidas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** — En el caso de 0 entradas vendidas, el organizador completa la eliminación mediante el flujo habitual. En los casos de 1 y 3 entradas vendidas, la eliminación se rechaza por todas las vías comprobadas.
- **SC-002** — El 100 % de los rechazos por ventas conserva el evento y todas sus entradas sin cambios atribuibles a la eliminación.
- **SC-003** — En el 100 % de las pruebas de concurrencia en las que la venta se confirma primero, el evento y la entrada siguen disponibles tras el rechazo. Si la eliminación termina primero, se confirman 0 ventas posteriores para ese evento.
- **SC-004** — Para los casos de 1 y 3 entradas vendidas, el organizador recibe un mensaje en español que explica el rechazo y muestra el número exacto, con la concordancia correspondiente.

## Assumptions

- Para esta protección, una entrada vendida equivale a una venta confirmada por el flujo de venta vigente. La revocación posterior conserva el antecedente de la venta para la decisión de eliminar.
- La Feature 001 es la referencia para el aforo. Esta especificación no redefine sus resultados ni las condiciones para confirmar una venta.
