# AGENTS.md — Door List

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Gestión del contexto y consumo de tokens

- No recorras todo el repositorio al iniciar una sesión.
- Inspecciona únicamente los archivos relacionados con la tarea solicitada.
- Consulta primero la documentación existente en `docs/`, si está disponible.
- Reutiliza el contexto disponible y evita lecturas repetitivas.
- Consulta únicamente la documentación de Next.js relevante para la tarea.
- Evita analizar archivos generados, dependencias y directorios completos innecesariamente.
- No leas `.next`, `node_modules`, `.modules` ni archivos `.env*`, excepto la documentación de Next.js requerida por las reglas anteriores.
- Mantén las respuestas breves, técnicas y directas.

## Permisos y aprobaciones

- Puedes crear y editar archivos dentro del proyecto sin solicitar confirmación adicional cuando sean necesarios para la tarea.
- Solicita aprobación antes de ejecutar comandos que accedan o modifiquen la base de datos.
- Solicita aprobación antes de ejecutar migraciones.
- Solicita aprobación antes de instalar, actualizar o eliminar dependencias.
- Solicita aprobación antes de realizar operaciones destructivas.
- No realices cambios fuera del alcance solicitado.

## Manejo de errores

- Si una herramienta falla, realiza como máximo un reintento cuando tenga sentido.
- Si persiste un error del sandbox, detén la ejecución e informa el problema.
- No realices intentos repetitivos utilizando herramientas alternativas cuando el entorno de ejecución esté fallando.

## Desarrollo

- Respeta la arquitectura y las convenciones existentes.
- Reutiliza componentes, servicios y utilidades.
- Evita refactorizaciones que no estén relacionadas con la tarea.
- Ejecuta únicamente las verificaciones necesarias para validar los cambios.
- No expongas credenciales ni información sensible.

## Documentación persistente

Mantén actualizados los siguientes archivos cuando existan cambios relevantes:

- `docs/architecture.md`: arquitectura del proyecto.
- `docs/business-rules.md`: reglas de negocio.
- `docs/database.md`: esquema y relaciones de la base de datos.
- `docs/project-status.md`: funcionalidades implementadas y pendientes.

No leas toda la documentación en cada tarea. Consulta únicamente los documentos necesarios.