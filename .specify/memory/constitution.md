# Door List Constitution

## Core Principles

### I. Método
- Toda funcionalidad nueva o cambio de comportamiento debe tener una especificación en
  `specs/` antes de implementarse. Una instrucción aislada no autoriza cambios de producto.
- Toda regla de negocio implementada en un trigger, una función SQL o el código de la
  aplicación debe estar explicada en una especificación de `specs/`.
- Todo cambio de esquema debe incorporarse en una migración nueva. Las migraciones ya
  aplicadas son inmutables.

### II. Calendario
- Toda fecha y hora se debe guardar en UTC y cada evento debe guardar su propia zona
  horaria. La visualización de fechas y el cálculo de la apertura y el cierre del registro
  y del acceso deben usar la zona del evento. Las zonas horarias fijas están prohibidas
  para esos cálculos.
- El cierre del registro y la ventana de ingreso deben ser campos explícitos del evento.
  La fecha del evento por sí sola no determina esos valores.

### III. Identidad y cantidad
- Cada entrada debe identificar a un asistente. La especificación debe definir cuántas
  entradas puede reservar un mismo email. Un índice único sobre el email no puede
  determinar esa cantidad.
- Toda reserva con email sin verificar debe caducar y liberar el cupo que ocupa.

### IV. Aforo
- Toda regla de aforo debe tener un criterio de aceptación con valores numéricos.
- El aforo del evento debe limitar el total de entradas de todos los tipos. Un cupo por
  tipo de entrada solo debe aplicarse como límite estricto si el organizador lo declara.
- Todo límite, global o por tipo de entrada, debe ser igual o mayor que el cupo ya consumido.
- Para publicar un evento debe existir al menos un tipo de entrada con cupo disponible.

### V. Acceso
- Todo identificador incluido en un QR o en una URL pública debe resistir intentos de
  adivinación y enumeración. La vista pública debe omitir el nombre y el email del asistente.
- La operación de puerta debe asignarse por evento mediante un rol separado de los permisos
  de edición y exportación.
- Una entrada revocada debe conservarse en la base de datos con su estado de revocación,
  excluirse de la lista operativa e incluirse en la exportación de auditoría.

## Requisitos de especificación

La especificación debe identificar las reglas de negocio que introduce o cambia.
Cuando corresponda, debe definir cuántas entradas puede reservar un email e incluir
los criterios de aceptación numéricos de cada regla de aforo.

## Revisión de cambios

En la revisión, se debe comprobar que cada cambio de comportamiento esté cubierto por
su especificación, que las reglas implementadas coincidan con ella y que los cambios de
esquema estén en migraciones nuevas.

## Governance

- Esta constitución rige las decisiones de producto y la revisión de cambios en Door List.
- Toda enmienda debe documentar su motivo, indicar qué principios afecta y recibir la
  aprobación de los responsables del proyecto antes de adoptarse.
- La versión debe actualizarse según SemVer. Un cambio incompatible, una eliminación o una
  redefinición incompatible requiere una versión mayor. Un principio nuevo o una ampliación
  sustantiva requiere una versión menor. Una aclaración sin cambio de significado requiere
  una versión de parche.
- La revisión de cada cambio debe comprobar el cumplimiento de los principios aplicables
  antes de aprobarlo.

**Version**: 1.0.0 | **Ratified**: 2026-11-28 | **Last Amended**: 2026-11-28
