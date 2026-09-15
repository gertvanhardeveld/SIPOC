import { useState } from "react";
import ModalShell from "./ModalShell";
import MasterListModal from "./MasterListModal";
import { useMasterTable } from "../../hooks/useMasterTable";
import type { StepInput, StepOutput } from "../../lib/board";

interface FieldModalProps {
  entity: StepInput | StepOutput;
  columnLabel: "Input" | "Output";
  onClose: () => void;
  onSave: (fields: { label: string | null; communicationTypeId: string | null }) => void;
}

/** Omschrijving + soort communicatie — opened by double-clicking an input
 * or output box. (Intern/extern wordt niet hier gekozen — dat gebeurt bij
 * de bijbehorende herkomst/bestemming, en bepaalt via PartyRef.kind ook de
 * kleur van dit blokje, zie StepBlock.) */
export default function FieldModal({ entity, columnLabel, onClose, onSave }: FieldModalProps) {
  const { items: communicationTypesList } = useMasterTable("communication_types");
  const [label, setLabel] = useState(entity.label ?? "");
  const [communicationTypeId, setCommunicationTypeId] = useState(entity.communicationTypeId ?? "");
  const [managing, setManaging] = useState(false);

  function commitLabel() {
    const trimmed = label.trim();
    onSave({ label: trimmed.length ? trimmed : null, communicationTypeId: communicationTypeId || null });
  }

  function handleCommChange(value: string) {
    setCommunicationTypeId(value);
    onSave({ label: label.trim() || null, communicationTypeId: value || null });
  }

  function handleClose() {
    commitLabel();
    onClose();
  }

  const title = entity.label || `Naamloze ${columnLabel.toLowerCase()}`;

  return (
    <>
      <ModalShell onClose={handleClose} titlePrefix="Details — " titleEm={title}>
        <div className="modal-field">
          <label htmlFor="field-label-input">Omschrijving</label>
          <input
            type="text"
            id="field-label-input"
            value={label}
            placeholder={columnLabel}
            autoComplete="off"
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="field-comm-select">Soort communicatie</label>
          <div className="modal-function-row">
            <select id="field-comm-select" value={communicationTypeId} onChange={(e) => handleCommChange(e.target.value)}>
              <option value="">— geen communicatie —</option>
              {communicationTypesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ellipsis-btn"
              title="Communicatiesoorten beheren"
              onClick={() => setManaging(true)}
            >
              &hellip;
            </button>
          </div>
        </div>
      </ModalShell>
      {managing && (
        <MasterListModal
          table="communication_types"
          title="Communicatiesoorten beheren"
          placeholder="Nieuwe communicatiesoort…"
          onClose={() => setManaging(false)}
          onChange={(newId) => {
            if (newId) handleCommChange(newId);
          }}
        />
      )}
    </>
  );
}
