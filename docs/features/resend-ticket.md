# Reenvío de entradas

El organizador puede reenviar por email la entrada de un asistente listado en el panel de su evento. La operación conserva la entrada, su código y su estado; admite tickets `valid` o `used` y envía al email del registro original.

`app/api/events/[eventId]/resend-ticket/route.ts` comprueba la sesión, la propiedad del evento y la pertenencia de la entrada. El endpoint reutiliza `lib/tickets/email.ts`, el mismo servicio que envía el correo del registro inicial.
