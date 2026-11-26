# AGENTS.md — Door List

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- Consulta únicamente la documentación instalada de Next.js relevante antes de escribir código del framework.
- Utiliza Server Components por defecto.
- Utiliza `"use client"` únicamente cuando exista una necesidad concreta de ejecución en el cliente.
- Utiliza `app/` para las rutas y coloca junto a ellas los componentes exclusivos de cada ruta.
- Utiliza `components/` para los componentes de UI compartidos por dos o más rutas.
- Utiliza `lib/` para la lógica, los tipos, las utilidades y los helpers compartidos de fechas y formatos.
- Utiliza `lib/supabase/` para los clientes de Supabase y `supabase/migrations/` para las migraciones.
- Respeta la arquitectura y las convenciones existentes; evita refactorizaciones ajenas a la tarea solicitada.
- Mantén consistentes los conceptos `Event`, `TicketType`, `Ticket` y `Registration` en todo el repositorio.
- No utilices entidades diferentes como sinónimos.
- Nombra las tablas en plural y `snake_case`, respetando el nombre de su entidad correspondiente.
- Escribe en inglés el código, las variables, las funciones, los componentes y los tipos.
- Escribe en español los textos visibles de la interfaz y las rutas públicas.
- Utiliza `kebab-case` para los nombres de archivos, salvo las convenciones obligatorias del framework.
- Utiliza PascalCase para los nombres de componentes.
- Limita `snake_case` a la capa de persistencia.
- Utiliza `camelCase` en los contratos de API, tanto en request como en response.
- Centraliza en `lib/` los tipos compartidos entre API, email y UI; no los redefinas en archivos individuales.
- No dupliques lógica de negocio ni utilidades.
- Reutiliza los componentes, servicios y utilidades existentes antes de crear otros nuevos.
- Devuelve los errores de API como JSON con la estructura `{ error: string }`.
- Utiliza códigos HTTP que correspondan al resultado real de la operación y no devuelvas HTTP 200 para errores de negocio.
- Comprueba `response.ok` antes de procesar una respuesta como exitosa.
- No expongas errores internos ni mensajes crudos de proveedores en la interfaz.
- Define todo cambio de esquema mediante migraciones versionadas y no ejecutes SQL suelto para modificarlo.
- Habilita RLS en toda tabla expuesta.
- Edita y crea archivos dentro del proyecto sin solicitar confirmación adicional cuando sean necesarios para la tarea y los permisos del entorno lo permitan.
- Solicita aprobación antes de ejecutar comandos que accedan o modifiquen la base de datos, incluidas las migraciones.
- Solicita aprobación antes de instalar, actualizar o eliminar dependencias.
- Solicita aprobación antes de realizar operaciones destructivas.
- No realices cambios fuera del alcance solicitado.
- No leas archivos con credenciales ni expongas información sensible.
- Respeta los cambios existentes del usuario y no reviertas modificaciones ajenas a la tarea.
- No recorras todo el repositorio al iniciar una sesión.
- Consulta primero la documentación existente relacionada con la tarea, incluida `docs/` cuando esté disponible.
- Inspecciona únicamente los archivos necesarios y reutiliza el contexto disponible para evitar lecturas repetitivas.
- Evita exploraciones innecesarias del repositorio y el análisis de archivos generados, dependencias o directorios completos.
- No leas `.next`, `.modules`, `node_modules` ni archivos `.env*`, excepto la documentación de Next.js requerida.
- Ejecuta únicamente las verificaciones necesarias para validar los cambios.
- Mantén las respuestas breves, técnicas y directas.
- Si una herramienta falla, realiza como máximo un reintento cuando tenga sentido.
- Detén la ejecución e informa el problema si persiste un error del sandbox.
- No realices intentos repetitivos con herramientas alternativas cuando el entorno de ejecución esté fallando.
- Consulta `docs/architecture.md` para conocer la arquitectura del proyecto cuando sea relevante.
- Consulta `docs/business-rules.md` para conocer las reglas de negocio cuando sea relevante.
- Consulta `docs/database.md` para conocer el esquema y las relaciones de la base de datos cuando sea relevante.
- Consulta `docs/project-status.md` para conocer las funcionalidades implementadas y pendientes cuando sea relevante.
- No leas toda la documentación en cada tarea; consulta únicamente los documentos relevantes.
- Actualiza los documentos de `docs/` correspondientes cuando se produzcan cambios relevantes en sus respectivos ámbitos.
- No documentes funcionalidades inexistentes ni inventes reglas de negocio.
