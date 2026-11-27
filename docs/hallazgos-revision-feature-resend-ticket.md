# Hallazgos de revisión: `feature/resend-ticket`

## Hallazgos

1. **Reenvío de entradas usadas sin indicar su estado (media).** El botón aparece también en filas con `ticketStatus === "used"` y la API permite reenviar un ticket `used`. `sendTicketEmail` utiliza el mismo texto de emisión inicial («Tu entrada está confirmada» y «Presenta el código QR adjunto al ingresar»), sin avisar que el ingreso ya se registró. El destinatario puede interpretar que el QR vuelve a habilitar el acceso. Referencias: `app/(dashboard)/dashboard/[eventId]/page.tsx`, `app/api/events/[eventId]/resend-ticket/route.ts`, `lib/tickets/email.ts`.
2. **Reenvíos consecutivos sin límite (media).** La API autentica y comprueba la propiedad del evento, pero no limita la frecuencia por usuario o entrada. Un organizador puede repetir la petición tantas veces como desee, con el correspondiente envío de correos y consumo del proveedor. Referencia: `app/api/events/[eventId]/resend-ticket/route.ts`.
3. **Cobertura de pruebas pendiente (media).** El commit no agrega pruebas para autorización, entradas de otros eventos, entradas revocadas, error del proveedor y envío correcto. Son los principales caminos de la nueva API. Referencia: `app/api/events/[eventId]/resend-ticket/route.ts`.

## Alcance

Revisión estática del commit `f9194eb` y de la función de correo compartida. No se ejecutaron pruebas ni se modificó la implementación.
