# Hallazgos de revisión: `feature/e2e-tests`

## Hallazgos

1. **El E2E no verifica la lectura del QR (media).** La prueba comprueba que la página muestra una imagen y que el adjunto empieza con la firma de un PNG. Después usa `ticketCode` de la respuesta de registro para hacer el check-in por el campo manual de `/scan`. No decodifica el QR ni comprueba que su contenido corresponda a la entrada emitida; un QR inválido podría pasar la prueba. Referencia: `tests/e2e/registration-flow.spec.ts`.
2. **Limpieza incompleta si falla el flujo (media).** El evento se elimina en `finally` solo cuando `eventCard` ya recibió un valor, después de esperar la confirmación de creación. Si el servidor crea el evento pero esa espera falla, el registro de prueba puede quedar en Supabase local. Además, un fallo al navegar o eliminar impide ejecutar `mailServer.close()`. Referencia: `tests/e2e/registration-flow.spec.ts`.
3. **Versión de Supabase CLI no fijada (baja).** `scripts/run-e2e.mjs` invoca `npx --yes supabase@latest status` en cada ejecución. El resultado depende de la versión disponible y puede requerir red o una descarga aun cuando el proyecto y Docker no hayan cambiado. Referencia: `scripts/run-e2e.mjs`.

## Alcance

Revisión estática del commit `3a03f58`. En la ejecución anterior al informe, `npm run test:e2e` pasó con Supabase local; en esta revisión no se volvió a ejecutar porque la tarea pidió documentar hallazgos sin modificar la implementación.
