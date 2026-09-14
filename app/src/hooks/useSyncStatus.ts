import { useCallback, useRef, useState } from "react";

export type SyncStatus = "idle" | "saving" | "error";

/** Mirrors index.html's `trackSave`: wrap any save promise and the status
 * label (used by the "Opgeslagen" / "Bezig met opslaan…" indicator) tracks
 * how many saves are still in flight. */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const pending = useRef(0);

  const track = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    pending.current++;
    setStatus("saving");
    return promise.then(
      (value) => {
        pending.current = Math.max(0, pending.current - 1);
        if (pending.current === 0) setStatus("idle");
        return value;
      },
      (err) => {
        pending.current = Math.max(0, pending.current - 1);
        console.error("Supabase sync error:", err);
        setStatus("error");
        throw err;
      },
    );
  }, []);

  return { status, track };
}
