import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

type Mode = "link" | "password";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("Vul een e-mailadres in.");
      return;
    }
    setBusy(true);
    setStatus("Bezig met versturen…");
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    setStatus(error ? `Mislukt: ${error.message}` : "Check je e-mail voor de inloglink!");
  }

  async function signInWithPassword(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setStatus("Vul e-mailadres en wachtwoord in.");
      return;
    }
    setBusy(true);
    setStatus("");
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    setBusy(false);
    if (error) setStatus(`Mislukt: ${error.message}`);
    // bij succes verwerkt onAuthStateChange de rest — geen navigatie nodig
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("");
    setPassword("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form
        onSubmit={mode === "link" ? sendMagicLink : signInWithPassword}
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

        {mode === "password" && (
          <>
            <label
              htmlFor="login-password"
              className="mb-1 block text-[12.5px] font-medium text-grey-text"
            >
              Wachtwoord
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mb-3 w-full rounded-md border border-grey-box-border px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {mode === "link" ? "Stuur inloglink" : "Inloggen"}
        </button>

        {status && (
          <p className="mt-3 text-[12.5px] text-grey-text">{status}</p>
        )}

        <p className="mt-4 text-center text-[12.5px] text-grey-text">
          {mode === "link" ? (
            <>
              Heb je al een wachtwoord ingesteld?{" "}
              <button
                type="button"
                onClick={() => switchMode("password")}
                className="text-accent hover:underline"
              >
                Log in met wachtwoord
              </button>
            </>
          ) : (
            <>
              Nog geen wachtwoord?{" "}
              <button
                type="button"
                onClick={() => switchMode("link")}
                className="text-accent hover:underline"
              >
                Log in met een link
              </button>{" "}
              en stel er daarna één in.
            </>
          )}
        </p>
      </form>
    </div>
  );
}
