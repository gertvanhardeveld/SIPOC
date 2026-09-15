import { useState, type FormEvent } from "react";
import ModalShell from "./ModalShell";
import { supabase } from "../../lib/supabaseClient";

interface SetPasswordModalProps {
  onClose: () => void;
}

/** Laat de ingelogde gebruiker (via de inloglink dus al een geldige
 * sessie) zelf een wachtwoord instellen — daarna kan diezelfde
 * e-mail+wachtwoord-combinatie gebruikt worden om in te loggen zonder
 * elke keer op een nieuwe link te hoeven wachten. Vereist geen
 * dashboard-wijziging: hetzelfde "email"-provider dat de magic link al
 * gebruikt, ondersteunt ook wachtwoord-login zodra er een wachtwoord op
 * het account staat. */
export default function SetPasswordModal({ onClose }: SetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Gebruik minstens 8 tekens.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMessage("De wachtwoorden komen niet overeen.");
      return;
    }
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("done");
  }

  return (
    <ModalShell onClose={onClose} title="Wachtwoord instellen">
      {status === "done" ? (
        <p className="text-sm text-dark-text">
          Wachtwoord ingesteld. Je kunt vanaf nu op het inlogscherm kiezen voor "Met wachtwoord" en direct inloggen
          met je e-mailadres en dit wachtwoord — zonder op een nieuwe inloglink te wachten.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="modal-field">
            <label htmlFor="new-password">Nieuw wachtwoord</label>
            <input
              type="password"
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="modal-field">
            <label htmlFor="confirm-password">Bevestig wachtwoord</label>
            <input
              type="password"
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {status === "saving" ? "Bezig…" : "Wachtwoord instellen"}
          </button>
        </form>
      )}
    </ModalShell>
  );
}
