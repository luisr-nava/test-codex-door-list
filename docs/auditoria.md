Honestamente: hay una base de convenciones, pero no está suficientemente
formalizada ni aplicada de forma uniforme. Varias decisiones se tomaron de
manera incremental.

Lo consistente:

- App Router con rutas públicas co-localizadas:
  `app/eventos/[eventId]/registro`, `app/entradas/[code]`.
- Separación básica de infraestructura en `lib/supabase`, lógica pública de
  registros en `lib/registrations` y correo en `lib/tickets`.
- Base de datos en `snake_case`; modelos de la respuesta pública en `camelCase`.
- Las páginas públicas usan componentes de servidor y el panel usa cliente de
  Supabase en un componente cliente.

Inconsistencias concretas:

- La regla de “registro abierto” no está centralizada. Hoy existe solo en la
  landing como `registrationIsOpen` en
  [app/page.tsx](D:/Programacion/ia/door-list/app/page.tsx:27), mientras que el
  panel enlaza siempre a registro en
  [app/organizador/page.tsx](D:/Programacion/ia/door-list/app/organizador/page.tsx:710).
  Además, la RPC SQL aplica su propia versión de la regla. Eso puede producir
  divergencias futuras.

- Hay duplicación de formateo de fechas y zona horaria. `formatEventDateTime`
  aparece en la landing, la página de registro y la página de entrada; el email
  tiene además otro formato. Todos usan Buenos Aires, pero no una utilidad
  única.

- Los tipos mezclan representación de base de datos y dominio. En el panel,
  `Event` tiene `starts_at` y `max_capacity`; en el flujo público,
  `PublicEventRegistration` transforma a `startsAt` y `remainingCapacity`. Es
  razonable en sí, pero no está explícito como convención ni hay mapeadores
  tipados. La landing vuelve a definir otro `PublicEvent` y hace un cast
  directo: `(data as PublicEvent[])`.

- Los nombres de componentes no acompañaron el cambio de ruta: el panel ahora
  está en `/organizador`, pero su export sigue llamándose `Home` en
  [app/organizador/page.tsx](D:/Programacion/ia/door-list/app/organizador/page.tsx:53).
  Eso es una señal clara de movimiento mecánico sin ajustar nomenclatura.

- La estructura creció de forma desigual: el panel está concentrado en una
  página de unas 700 líneas, mientras que registro separa `page`, `actions` y
  `registration-form`. No hay una convención consistente sobre cuándo extraer
  componentes, hooks, tipos y acciones.

- El manejo de errores también es heterogéneo:
  - El panel convierte algunos errores de Supabase con `readableError`, pero
    muchas operaciones no están envueltas en `try/finally`; una excepción
    inesperada puede dejar `saving` activo.
  - La acción de registro devuelve estados de UI bien tipados, pero captura
    errores generales y descarta la causa en
    [actions.ts](D:/Programacion/ia/door-list/app/eventos/[eventId]/registro/actions.ts:120).
  - La landing hace `throw error` directamente, así que un fallo de Supabase
    termina en la pantalla de error estándar de Next, no en un estado público
    diseñado.
  - El fallo de email se registra con un mensaje genérico sin el error original,
    lo que protege datos pero dificulta diagnosticar Resend.

- Hay una dependencia de dominio poco limpia:
  [lib/tickets/email.ts](D:/Programacion/ia/door-list/lib/tickets/email.ts)
  importa `PublicTicket` desde `lib/registrations/types`. “Tickets” depende de
  “registrations”, cuando ese tipo probablemente debería vivir en un módulo de
  entradas compartido.

Mi conclusión: no es código caótico, y las decisiones de seguridad importantes
están bastante bien separadas; pero no diría que existe todavía una convención
de arquitectura plenamente definida. Hay convenciones emergentes y varios puntos
donde convendría consolidarlas antes de seguir añadiendo funcionalidades.

