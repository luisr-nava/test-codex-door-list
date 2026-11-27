# Búsqueda de asistentes por email en puerta

Cuando el QR y el código de respaldo no se pueden leer, el personal de puerta autenticado con la cuenta del organizador puede buscar por email exacto dentro del evento seleccionado en `/scan`.

La búsqueda consulta `registrations`, `tickets` y `ticket_types` con la sesión del organizador y las políticas RLS existentes. Muestra el asistente, el tipo de entrada y su estado. Si la entrada está `valid`, confirma el ingreso mediante el endpoint de check-in existente y conserva su protección de concurrencia. Las entradas `used` o `revoke` no se pueden confirmar otra vez.
