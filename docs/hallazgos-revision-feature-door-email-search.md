# Hallazgos de revisión: `feature/door-email-search`

## Hallazgo

1. **Cobertura de pruebas pendiente (media).** El commit agrega la búsqueda por email y la confirmación de ingreso desde `/scan`, pero no incorpora pruebas para email inexistente, entrada usada o revocada, cambio de evento durante una búsqueda y errores de red. La lógica depende de tres consultas a Supabase y del endpoint de check-in; estos caminos quedan sin verificación automatizada. Referencia: `app/scan/scan-station.tsx`.

## Alcance

Revisión estática del commit `0e72649` y de las políticas RLS existentes. No se ejecutaron pruebas ni se modificó la implementación. No se identificó otro defecto funcional confirmado en este alcance.
