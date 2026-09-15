import { supabase } from "./supabaseClient";

/** Maakt een nieuw account aan met een eerste wachtwoord, via de
 * admin-create-user edge function (die de service-role-sleutel
 * gebruikt — die mag nooit in de browser-code staan). De nieuwe
 * gebruiker kan daarna direct met e-mail + dit wachtwoord inloggen en
 * het zelf wijzigen via "Wachtwoord instellen". */
export async function createUserWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-create-user", {
    body: { email, password },
  });
  if (!error) return;

  let message = error.message;
  if ("context" in error && error.context instanceof Response) {
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      // geen JSON-body beschikbaar, val terug op de generieke foutmelding
    }
  }
  throw new Error(message);
}
