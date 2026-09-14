import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("Vul een e-mailadres in.");
      return;
    }
    setSending(true);
    setStatus("Bezig met versturen…");
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    setSending(false);
    setStatus(
      error ? `Mislukt: ${error.message}` : "Check je e-mail voor de inloglink!",
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form
        onSubmit={sendMagicLink}
        className="w-full max-w-sm rounded-xl border border-border bg-panel p-7"
      >
        <h1 className="mb-1 text-lg font-bold text-header-text">SIPOC</h1>
        <p className="mb-5 text-[12.5px] text-grey-text">
          Log in om processen te bekijken en te bewerken.
        </p>

        <label
          htmlFor="login-email"
          className="mb-1 block text-[12.5px] font-medium text-grey-text"
        >
          E-mailadres
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@voorbeeld.nl"
          autoComplete="email"
          className="mb-3 w-full rounded-md border border-grey-box-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Stuur inloglink
        </button>

        {status && (
          <p className="mt-3 text-[12.5px] text-grey-text">{status}</p>
        )}
      </form>
    </div>
  );
}
