import { useState } from "react";
import ModalShell from "./ModalShell";
import MasterListModal from "./MasterListModal";
import { useMasterTable } from "../../hooks/useMasterTable";
import ProcessEditorsField from "../ProcessEditorsField";

interface ProcessModalProps {
  processId: string;
  name: string | null;
  description: string | null;
  version: string | null;
  goal: string | null;
  ownerId: string | null;
  isOwner: boolean;
  onClose: () => void;
  onSave: (fields: {
    description: string | null;
    version: string | null;
    goal: string | null;
    ownerId: string | null;
  }) => void;
}

/** Omschrijving, versienummer, doelomschrijving, proceseigenaar — plus, for
 * the process owner, who else may edit it. Opened by double-clicking the
 * process-name header box. */
export default function ProcessModal({
  processId,
  name,
  description,
  version,
  goal,
  ownerId,
  isOwner,
  onClose,
  onSave,
}: ProcessModalProps) {
  const { items: processOwnersList } = useMasterTable("process_owners");
  const [desc, setDesc] = useState(description ?? "");
  const [ver, setVer] = useState(version ?? "0.1");
  const [goalText, setGoalText] = useState(goal ?? "");
  const [owner, setOwner] = useState(ownerId ?? "");
  const [managingOwners, setManagingOwners] = useState(false);

  function commitAll() {
    onSave({
      description: desc.trim() || null,
      version: ver.trim() || null,
      goal: goalText.trim() || null,
      ownerId: owner || null,
    });
  }

  function handleOwnerChange(value: string) {
    setOwner(value);
    onSave({
      description: desc.trim() || null,
      version: ver.trim() || null,
      goal: goalText.trim() || null,
      ownerId: value || null,
    });
  }

  function handleClose() {
    commitAll();
    onClose();
  }

  const title = name || "Naamloos proces";

  return (
    <>
      <ModalShell onClose={handleClose} titlePrefix="Details — " titleEm={title}>
        <div className="modal-field">
          <label htmlFor="process-desc">Omschrijving</label>
          <textarea
            id="process-desc"
            placeholder="Beschrijf hier het proces…"
            value={desc}
            autoFocus
            onChange={(e) => setDesc(e.target.value)}
            onBlur={commitAll}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="process-version">Versienummer</label>
          <input
            type="text"
            id="process-version"
            placeholder="0.1"
            autoComplete="off"
            value={ver}
            onChange={(e) => setVer(e.target.value)}
            onBlur={commitAll}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="process-goal">Doelomschrijving</label>
          <textarea
            id="process-goal"
            placeholder="Wat is het doel van dit proces?"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            onBlur={commitAll}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="process-owner">Proceseigenaar</label>
          <div className="modal-function-row">
            <select id="process-owner" value={owner} onChange={(e) => handleOwnerChange(e.target.value)}>
              <option value="">— geen eigenaar —</option>
              {processOwnersList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ellipsis-btn"
              title="Proceseigenaren beheren"
              onClick={() => setManagingOwners(true)}
            >
              &hellip;
            </button>
          </div>
        </div>
        {isOwner && <ProcessEditorsField processId={processId} />}
      </ModalShell>
      {managingOwners && (
        <MasterListModal
          table="process_owners"
          title="Proceseigenaren beheren"
          placeholder="Nieuwe proceseigenaar…"
          onClose={() => setManagingOwners(false)}
          onChange={(newId) => {
            if (newId) handleOwnerChange(newId);
          }}
        />
      )}
    </>
  );
}
