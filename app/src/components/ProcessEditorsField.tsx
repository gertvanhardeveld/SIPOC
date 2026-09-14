import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addProcessEditorByEmail, fetchProcessEditors, removeProcessEditor, type ProcessEditor } from "../lib/processes";

/** Wie mag dit proces bewerken — los van de "proceseigenaar" (een
 * business-veld); dit is echte toegang tot de app. Mag beheerd worden door
 * de aanmaker (created_by), en op een "open" legacy-proces (created_by is
 * null) door iedereen die is ingelogd — zie ProcessModal/AccessPage voor
 * die voorwaarde. Gedeeld tussen het procesformulier (dubbelklik op de
 * procesnaam) en het rechtenoverzicht (/toegang), zodat je niet elk proces
 * hoeft te openen om iemand toe te voegen of te verwijderen. */
export default function ProcessEditorsField({ processId }: { processId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["process-editors", processId];
  const { data: editors = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchProcessEditors(processId),
  });
  const [email, setEmail] = useState("");

  const addMutation = useMutation({
    mutationFn: (email: string) => addProcessEditorByEmail(processId, email),
    onSuccess: (result) => {
      if (result === "not_found") {
        window.alert(
          "Geen account gevonden met dit e-mailadres. Deze persoon moet eerst minstens één keer inloggen.",
        );
        return;
      }
      if (result === "ok") {
        setEmail("");
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProcessEditor(processId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  function handleAdd() {
    if (!email.trim()) return;
    addMutation.mutate(email);
  }

  return (
    <div className="modal-field">
      <label>Bewerkers (mogen dit proces ook aanpassen)</label>
      <div className="function-list">
        {isLoading ? (
          <p className="function-empty">Laden…</p>
        ) : editors.length === 0 ? (
          <p className="function-empty">Nog geen bewerkers toegevoegd.</p>
        ) : (
          editors.map((ed: ProcessEditor) => (
            <div className="function-row" key={ed.user_id}>
              <span>{ed.email}</span>
              <button type="button" title="Verwijderen" onClick={() => removeMutation.mutate(ed.user_id)}>
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      <div className="function-add-row">
        <input
          type="email"
          placeholder="e-mailadres…"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button type="button" onClick={handleAdd}>
          + Toevoegen
        </button>
      </div>
    </div>
  );
}
