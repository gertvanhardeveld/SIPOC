import { useState } from "react";
import ModalShell from "./ModalShell";
import MasterListModal from "./MasterListModal";
import { useMasterTable } from "../../hooks/useMasterTable";
import { partyResolvedLabel, type PartyRef } from "../../lib/board";

interface PartyModalProps {
  party: PartyRef;
  columnLabel: "Supplier" | "Customer";
  onClose: () => void;
  onSave: (party: PartyRef) => void;
}

/** Herkomst/bestemming: intern (een functie) of extern (een externe
 * partij) — opened by clicking a supplier or customer box. */
export default function PartyModal({ party, columnLabel, onClose, onSave }: PartyModalProps) {
  const { items: functionsList } = useMasterTable("functions");
  const { items: externalPartiesList } = useMasterTable("external_parties");
  const [managing, setManaging] = useState<"functions" | "external_parties" | null>(null);

  // The rectangle shows the chosen function/external party, not a
  // hand-typed label — keep `label` in sync with the current choice so it
  // (and the modal title) always reflect it, just like index.html's persist().
  function update(patch: Partial<PartyRef>) {
    const next: PartyRef = { ...party, ...patch };
    next.label = partyResolvedLabel(next, functionsList, externalPartiesList);
    onSave(next);
  }

  function handleKindChange(kind: PartyRef["kind"]) {
    update({
      kind,
      functionId: kind === "intern" ? party.functionId : null,
      externalId: kind === "extern" ? party.externalId : null,
    });
  }

  const resolvedLabel = partyResolvedLabel(party, functionsList, externalPartiesList);
  const title = resolvedLabel || `Naamloze ${columnLabel.toLowerCase()}`;

  return (
    <>
      <ModalShell onClose={onClose} titlePrefix="Details — " titleEm={title}>
        <div className="modal-field">
          <label htmlFor="party-kind">Type</label>
          <select
            id="party-kind"
            value={party.kind ?? ""}
            onChange={(e) => handleKindChange((e.target.value || null) as PartyRef["kind"])}
          >
            <option value="">— kies —</option>
            <option value="intern">Intern</option>
            <option value="extern">Extern</option>
          </select>
        </div>
        {party.kind === "intern" && (
          <div className="modal-field">
            <label htmlFor="party-ref-select">Functie</label>
            <div className="modal-function-row">
              <select
                id="party-ref-select"
                value={party.functionId ?? ""}
                onChange={(e) => update({ functionId: e.target.value || null })}
              >
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
                onClick={() => setManaging("functions")}
              >
                &hellip;
              </button>
            </div>
          </div>
        )}
        {party.kind === "extern" && (
          <div className="modal-field">
            <label htmlFor="party-ref-select">Externe partij</label>
            <div className="modal-function-row">
              <select
                id="party-ref-select"
                value={party.externalId ?? ""}
                onChange={(e) => update({ externalId: e.target.value || null })}
              >
                <option value="">— geen externe partij —</option>
                {externalPartiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ellipsis-btn"
                title="Externe partijen beheren"
                onClick={() => setManaging("external_parties")}
              >
                &hellip;
              </button>
            </div>
          </div>
        )}
      </ModalShell>
      {managing === "functions" && (
        <MasterListModal
          table="functions"
          title="Functies beheren"
          placeholder="Nieuwe functie…"
          onClose={() => setManaging(null)}
          onChange={(newId) => {
            if (newId) update({ functionId: newId });
          }}
        />
      )}
      {managing === "external_parties" && (
        <MasterListModal
          table="external_parties"
          title="Externe partijen beheren"
          placeholder="Nieuwe externe partij…"
          onClose={() => setManaging(null)}
          onChange={(newId) => {
            if (newId) update({ externalId: newId });
          }}
        />
      )}
    </>
  );
}
