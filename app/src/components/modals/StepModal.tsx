import { useState } from "react";
import ModalShell from "./ModalShell";
import MasterListModal from "./MasterListModal";
import { useMasterTable } from "../../hooks/useMasterTable";
import type { SipocStep } from "../../lib/board";

interface StepModalProps {
  step: SipocStep;
  onClose: () => void;
  onSave: (fields: { instructions: string | null; functionId: string | null; isDecision: boolean }) => void;
}

/** Werkinstructie + functie + beslissing — opened by double-clicking a
 * process-step box. */
export default function StepModal({ step, onClose, onSave }: StepModalProps) {
  const { items: functionsList } = useMasterTable("functions");
  const [instructions, setInstructions] = useState(step.instructions ?? "");
  const [functionId, setFunctionId] = useState(step.functionId ?? "");
  const [isDecision, setIsDecision] = useState(step.isDecision);
  const [managingFunctions, setManagingFunctions] = useState(false);

  function commitInstructions() {
    const trimmed = instructions.trim();
    onSave({ instructions: trimmed.length ? trimmed : null, functionId: functionId || null, isDecision });
  }

  function handleFunctionChange(value: string) {
    setFunctionId(value);
    onSave({ instructions: instructions.trim() || null, functionId: value || null, isDecision });
  }

  function handleDecisionChange(value: boolean) {
    setIsDecision(value);
    onSave({ instructions: instructions.trim() || null, functionId: functionId || null, isDecision: value });
  }

  function handleClose() {
    commitInstructions();
    onClose();
  }

  const title = step.label || "Naamloze processtap";

  return (
    <>
      <ModalShell onClose={handleClose} titlePrefix="Details — " titleEm={title}>
        <div className="modal-field">
          <label htmlFor="modal-instructions">Werkinstructie</label>
          <textarea
            id="modal-instructions"
            placeholder="Beschrijf hier de werkinstructie…"
            value={instructions}
            autoFocus
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={commitInstructions}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="modal-function">Functie</label>
          <div className="modal-function-row">
            <select id="modal-function" value={functionId} onChange={(e) => handleFunctionChange(e.target.value)}>
              <option value="">— geen functie —</option>
              {functionsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ellipsis-btn"
              title="Functies beheren"
              onClick={() => setManagingFunctions(true)}
            >
              &hellip;
            </button>
          </div>
        </div>
        <div className="modal-field">
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={isDecision}
              onChange={(e) => handleDecisionChange(e.target.checked)}
            />
            Beslissing
          </label>
        </div>
      </ModalShell>
      {managingFunctions && (
        <MasterListModal
          table="functions"
          title="Functies beheren"
          placeholder="Nieuwe functie…"
          onClose={() => setManagingFunctions(false)}
          onChange={(newId) => {
            if (newId) handleFunctionChange(newId);
          }}
        />
      )}
    </>
  );
}
