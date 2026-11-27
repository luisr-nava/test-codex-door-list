import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const hasLocalSupabase = Boolean(supabaseUrl && supabaseKey
  && ["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
  webServer: hasLocalSupabase ? {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/organizador`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_RESEND_API_URL: "http://127.0.0.1:4317/emails",
      RESEND_API_KEY: "e2e-local-key",
      RESEND_FROM_EMAIL: "tickets@example.test",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey!,
    },
  } : undefined,
});
