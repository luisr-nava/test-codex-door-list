# Prueba integral

La prueba de Playwright recorre el panel del organizador, publica un evento,
agrega un tipo de entrada, registra un asistente, comprueba el email y el QR
adjunto, abre la entrada y valida su ingreso desde `/scan` mediante el código
de respaldo. Comprueba que el panel rechaza el borrado del evento con la entrada usada.

Las pruebas de eliminación verifican el contrato de PostgREST, los avisos del panel para una y tres ventas, una entrada revocada, el borrado con cero ventas y una emisión concurrente con un borrado real desde el panel. La limpieza elimina únicamente los datos de cada fixture en el contenedor local.

Requisitos:

- Supabase local con las migraciones del proyecto aplicadas. Las fixtures de eliminación usan el `psql` del contenedor `supabase_db_door-list` mediante el contexto local `default` de Docker.
- Chromium de Playwright instalado (`npx playwright install chromium`).

Ejecutá `npm run test:e2e` desde la raíz del proyecto. El comando obtiene
la URL y las claves de Supabase local, prepara un organizador de prueba reutilizable, configura
las variables `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`,
`E2E_ORGANIZER_EMAIL` y `E2E_ORGANIZER_PASSWORD` para Playwright. No hace
falta crear ni cargar un archivo `.env`
para esta prueba. La app de desarrollo debe estar detenida: Playwright inicia
su propio servidor Next en el puerto 3100 y el receptor local de correo usa
el 4317.

El receptor simula Resend solo durante el test y permite verificar el mensaje
sin usar credenciales ni enviar correo real. La prueba usa la entrada manual
de `/scan`; no automatiza la cámara física.
