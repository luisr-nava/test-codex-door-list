# Reglas de negocio y flujos

## Organizadores

- El acceso al panel requiere una sesión Supabase; permite iniciar sesión, crear cuenta y cerrar sesión.
- Un organizador solo puede consultar, crear, modificar y eliminar sus propios eventos.
- Un evento tiene título, descripción, fecha/hora, lugar, aforo máximo y estado `draft` o `published`.
- El organizador puede editar o eliminar eventos y administrar sus tipos de entrada.
- Cada tipo de entrada tiene nombre y capacidad positiva; el nombre es único dentro del evento.
- La suma de capacidades de los tipos de entrada no puede superar el aforo del evento.
- Un tipo de entrada no puede trasladarse a otro evento y el propietario de un evento no puede cambiarse.
- El enlace público se ofrece cuando el evento está publicado y su fecha, comparada por día en Buenos Aires, no pasó.

## Registro público

- Solo se muestra un evento publicado cuya fecha en `America/Argentina/Buenos_Aires` sea hoy o futura.
- El asistente debe elegir un tipo disponible, informar nombre y email.
- El nombre se recorta y admite entre 1 y 160 caracteres.
- El email se normaliza a minúsculas, se recorta y debe tener formato válido y entre 3 y 320 caracteres.
- Un email solo puede registrarse una vez por evento.
- La confirmación vuelve a comprobar evento, entrada y cupo dentro de PostgreSQL.
- Si una entrada se agota durante el proceso, el formulario refresca las disponibilidades.
- Al confirmar, se muestra una reserva exitosa; no se observa envío de correo ni emisión de tickets.
- Si no quedan plazas, la página muestra el estado de entradas agotadas.

## Flujos observados

1. El organizador se autentica y carga sus eventos y entradas.
2. Crea o edita un evento y asigna tipos de entrada sin superar el aforo.
3. Publica el evento y abre o copia su enlace de registro mientras siga vigente.
4. El asistente completa el formulario; la Server Action valida y llama a `create_public_registration`.
5. PostgreSQL confirma o devuelve códigos como `EVENT_UNAVAILABLE`, `TICKET_UNAVAILABLE`, `DUPLICATE_EMAIL` o `INVALID_INPUT`.
