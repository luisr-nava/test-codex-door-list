import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if ((!supabaseUrl || !supabasePublishableKey) && typeof window !== "undefined") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  // Client Components are rendered once while Next builds the static shell.
  // Do not contact this placeholder: a real browser still receives the clear
  // configuration error above before it can make an auth or data request.
  return createClient(
    supabaseUrl ?? "https://supabase-not-configured.invalid",
    supabasePublishableKey ?? "supabase-not-configured",
  );
}
