import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModalShell from "./ModalShell";
import MasterListModal from "./MasterListModal";
import { useMasterTable } from "../../hooks/useMasterTable";
import { fetchProcessList } from "../../lib/processes";
import {
  fetchStepProcessId,
  fetchStepsForProcess,
  partyResolvedLabel,
  type PartyRef,
} from "../../lib/board";

interface PartyModalProps {
  party: PartyRef;
  columnLabel: "Supplier" | "Customer";
  /** Het proces waar dit blokje zelf in staat — wordt uit de
   * "Procesactiviteit"-processelector gefilterd, want de bedoeling is een
   * verwijzing naar een ándér proces, niet naar dit proces zelf. */
  currentProcessId: string;
  onClose: () => void;
  onSave: (party: PartyRef) => void;
}

/** Herkomst/bestemming: intern (een functie, of een activiteit in een
 * ander proces) of extern (een externe partij) — opened by clicking a
 * supplier or customer box. */
export default function PartyModal({ party, columnLabel, currentProcessId, onClose, onSave }: PartyModalProps) {
  const { items: functionsList } = useMasterTable("functions");
  const { items: externalPartiesList } = useMasterTable("external_parties");
  const [managing, setManaging] = useState<"functions" | "external_parties" | null>(null);
  // null = "not explicitly chosen yet in this modal session" -> fall back
  // to whichever process the existing stepId (if any) turns out to
  // belong to, resolved below. Once the user picks one, that always wins.
  const [refProcessIdOverride, setRefProcessIdOverride] = useState<string | null>(null);

  const { data: processList = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: fetchProcessList,
  });

  // Bij een bestaande "activiteit"-verwijzing weten we welk proces erbij
  // hoort pas na deze lookup — zo kan de processelector meteen op het
  // juiste proces staan in plaats van leeg.
  const { data: existingStepProcessId } = useQuery({
    queryKey: ["step-process-id", party.stepId],
    queryFn: () => fetchStepProcessId(party.stepId!),
    enabled: party.internalType === "activiteit" && !!party.stepId && refProcessIdOverride === null,
  });
  const refProcessId = refProcessIdOverride ?? existingStepProcessId ?? "";

  const { data: processSteps = [] } = useQuery({
    queryKey: ["process-steps", refProcessId],
    queryFn: () => fetchStepsForProcess(refProcessId),
    enabled: !!refProcessId,
  });

  // The rectangle shows the chosen function/activiteit/external party, not
  // a hand-typed label — keep `label` in sync with the current choice so
  // it (and the modal title) always reflect it, just like index.html's
  // persist().
  function update(patch: Partial<PartyRef>) {
    const next: PartyRef = { ...party, ...patch };
    next.label = partyResolvedLabel(next, functionsList, externalPartiesList, processSteps);
    onSave(next);
  }

  function handleKindChange(kind: PartyRef["kind"]) {
    update({
      kind,
      internalType: kind === "intern" ? party.internalType : null,
      functionId: kind === "intern" ? party.functionId : null,
      stepId: kind === "intern" ? party.stepId : null,
      externalId: kind === "extern" ? party.externalId : null,
    });
  }

  function handleInternalTypeChange(value: PartyRef["internalType"]) {
    if (value !== "activiteit") setRefProcessIdOverride(null);
    update({
      internalType: value,
      functionId: value === "functie" ? party.functionId : null,
      stepId: value === "activiteit" ? party.stepId : null,
    });
  }

  function handleRefProcessChange(processId: string) {
    setRefProcessIdOverride(processId);
    update({ stepId: null });
  }

  const resolvedLabel = partyResolvedLabel(party, functionsList, externalPartiesList, processSteps);
  const title = resolvedLabel || `Naamloze ${columnLabel.toLowerCase()}`;
  const otherProcesses = processList.filter((p) => p.id !== currentProcessId);

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
            <label htmlFor="party-internal-type">Soort verwijzing</label>
            <select
              id="party-internal-type"
              value={party.internalType ?? ""}
              onChange={(e) => handleInternalTypeChange((e.target.value || null) as PartyRef["internalType"])}
            >
              <option value="">— kies —</option>
              <option value="functie">Functie</option>
              <option value="activiteit">Procesactiviteit</option>
            </select>
          </div>
        )}
        {party.kind === "intern" && party.internalType === "functie" && (
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
        {party.kind === "intern" && party.internalType === "activiteit" && (
          <>
            <div className="modal-field">
              <label htmlFor="party-ref-process">Proces</label>
              <select
                id="party-ref-process"
                value={refProcessId}
                onChange={(e) => handleRefProcessChange(e.target.value)}
              >
                <option value="">— kies een proces —</option>
                {otherProcesses.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || "Naamloos proces"}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="party-ref-step">Activiteit</label>
              <select
                id="party-ref-step"
                value={party.stepId ?? ""}
                onChange={(e) => update({ stepId: e.target.value || null })}
                disabled={!refProcessId}
              >
                <option value="">— kies een activiteit —</option>
                {processSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
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
