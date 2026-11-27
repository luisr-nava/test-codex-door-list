import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const isWindows = process.platform === "win32";
const statusCommand = isWindows ? "npx.cmd" : "npx";
const statusResult = spawnSync(
  `${statusCommand} --yes supabase@latest status -o json`,
  { encoding: "utf8", shell: true, windowsHide: true },
);

if (statusResult.error || statusResult.status !== 0) {
  console.error("No se pudo consultar Supabase local. Verificá que Docker y Supabase estén iniciados.");
  process.exit(1);
}

let status;
try {
  status = JSON.parse(statusResult.stdout);
} catch {
  console.error("Supabase local no devolvió un estado válido.");
  process.exit(1);
}

let apiUrl;
try {
  apiUrl = new URL(status.API_URL);
} catch {
  console.error("Supabase local no devolvió una URL de API válida.");
  process.exit(1);
}

if (!["127.0.0.1", "localhost"].includes(apiUrl.hostname)
  || !status.PUBLISHABLE_KEY || !status.SERVICE_ROLE_KEY) {
  console.error("La instancia local no devolvió las claves necesarias para el E2E.");
  process.exit(1);
}

const email = "door-list-e2e@example.test";
const password = `${createHash("sha256")
  .update(`door-list-e2e:${status.SERVICE_ROLE_KEY}`)
  .digest("base64url")}Aa1!`;
const admin = createClient(apiUrl.toString(), status.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
if (listError) {
  console.error("No se pudieron consultar los organizadores de prueba en Supabase local.");
  process.exit(1);
}

const existing = users.users.find((user) => user.email === email);
const { error: userError } = existing
  ? await admin.auth.admin.updateUserById(existing.id, { password })
  : await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (userError) {
  console.error("No se pudo preparar el organizador de prueba en Supabase local.");
  process.exit(1);
}

const command = isWindows ? "npm.cmd run test:e2e:playwright" : "npm run test:e2e:playwright";
const result = spawnSync(command, {
  shell: true,
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    E2E_SUPABASE_URL: apiUrl.toString(),
    E2E_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    E2E_ORGANIZER_EMAIL: email,
    E2E_ORGANIZER_PASSWORD: password,
  },
});
process.exitCode = result.status ?? 1;
