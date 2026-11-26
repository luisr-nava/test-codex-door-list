# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Organizadores de eventos pequeños y medianos que necesitan crear, publicar y gestionar sus eventos, tipos de entrada, aforo y asistentes.
- Asistentes que abren un enlace puntual para registrarse y consultar su entrada.

## Product Purpose

Door List permite registrar asistentes a eventos y operar el acceso de forma ágil. El producto cubre la creación y publicación de eventos, el registro público, la emisión de entradas con QR y la consulta de asistentes para que el ingreso al evento sea rápido.

## Positioning

Una plataforma operativa de registro para eventos pequeños y medianos: hace fácil que los asistentes se registren desde un enlace y prepara una operación de check-in rápida en la puerta.

## Operating Context

- Los organizadores configuran eventos, aforo y tipos de entrada desde el panel privado.
- Los asistentes se registran una sola vez desde un enlace público y reciben una entrada con QR.
- La operación de acceso ocurre en la puerta del evento, donde la velocidad de consulta y check-in es prioritaria.

## Capabilities and Constraints

- Los eventos tienen título, descripción, fecha, lugar, aforo y estado de borrador o publicado.
- Cada evento puede tener tipos de entrada cuya capacidad total no supera el aforo.
- El registro público requiere elegir una entrada disponible, nombre y correo; evita registros duplicados por evento y controla disponibilidad.
- Cada registro confirmado emite una entrada con código secreto, QR y estado `valid`, `used` o `revoke`.
- El acceso de organizadores requiere autenticación; cada uno solo administra sus propios eventos y asistentes.
- No se evidencian pagos ni cancelaciones como capacidades actuales.

## Brand Commitments

- La experiencia debe ser directa y operativa.
- La interfaz no debe incorporar decoración que estorbe durante la operación en puerta.

## Evidence on Hand

- Implementación de landing pública, panel de organizador, registro público, entrada con QR y panel de asistentes en el repositorio.
- Las reglas de registro, aforo, entradas y permisos están documentadas en `docs/business-rules.md`.
- No hay evidencia de pagos, cancelaciones, testimonios, clientes o métricas que futuras superficies deban inventar.

## Product Principles

1. El registro del asistente debe requerir el mínimo esfuerzo necesario.
2. La operación del organizador debe ser clara y rápida, especialmente cerca del acceso al evento.
3. La disponibilidad y el aforo deben ser confiables incluso ante registros simultáneos.
4. Cada asistente consulta su entrada de forma privada mediante un enlace seguro.
5. La interfaz prioriza utilidad y lectura inmediata por encima de la decoración.

## Accessibility & Inclusion

La interfaz debe mantener legibilidad y acciones identificables en contextos operativos de alta velocidad, como la puerta de un evento.
