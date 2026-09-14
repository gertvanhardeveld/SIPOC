import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Ontbrekende Supabase-configuratie: zet VITE_SUPABASE_URL en VITE_SUPABASE_PUBLISHABLE_KEY in .env.local (zie .env.example).",
  );
}

export const supabase = createClient(url, publishableKey);
