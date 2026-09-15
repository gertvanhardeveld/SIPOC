import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import { canEditProcess, fetchProcess, saveProcess } from "../lib/processes";
import type { ProcessSummary } from "../lib/types";
import {
  deleteInputRow,
  deleteOutputRow,
  deleteStepRow,
  loadSteps,
  makeInput,
  makeOutput,
  makeParty,
  makeStep,
  syncInputRow,
  syncInputsOrder,
  syncOutputRow,
  syncOutputsOrder,
  syncStepRow,
  syncStepsOrder,
  type PartyRef,
  type SipocStep,
} from "../lib/board";
import { useMasterTable } from "../hooks/useMasterTable";
import { useSyncStatus } from "../hooks/useSyncStatus";
import Board, { type BoardActions } from "../components/board/Board";
import ProcessHeader from "../components/board/ProcessHeader";
import StepModal from "../components/modals/StepModal";
import FieldModal from "../components/modals/FieldModal";
import PartyModal from "../components/modals/PartyModal";
import ProcessModal from "../components/modals/ProcessModal";

type FieldTarget = { kind: "input" | "output"; stepIdx: number; idx: number };
type PartyTarget = { kind: "supplier" | "customer"; stepIdx: number; idx: number };

export default function ProcessPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { status: syncStatus, track } = useSyncStatus();

  const {
    data: processRecord,
    isLoading: processLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["process", id],
    queryFn: () => fetchProcess(id!),
    enabled: !!id,
  });

  const { data: canEdit } = useQuery({
    queryKey: ["can-edit", id, user?.id],
    queryFn: () => canEditProcess(processRecord!, user?.id ?? null),
    enabled: !!processRecord && !!user,
  });

  const { items: functionsList } = useMasterTable("functions");
  const { items: externalPartiesList } = useMasterTable("external_parties");

  // Local, optimistically-updated copies of the editable fields — loaded
  // once from the query, then mutated directly (and persisted) on every
  // change, same pattern as index.html's in-memory `state`.
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [steps, setSteps] = useState<SipocStep[] | null>(null);

  const [stepModalIdx, setStepModalIdx] = useState<number | null>(null);
  const [fieldModal, setFieldModal] = useState<FieldTarget | null>(null);
  const [partyModal, setPartyModal] = useState<PartyTarget | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);

  useEffect(() => {
    if (processRecord) {
      setName(processRecord.name);
      setDescription(processRecord.description);
      setVersion(processRecord.version);
      setGoal(processRecord.goal_description);
      setOwnerId(processRecord.owner_id);
    }
  }, [processRecord]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSteps(null);
    setStepModalIdx(null);
    setFieldModal(null);
    setPartyModal(null);
    setProcessModalOpen(false);
    loadSteps(id)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.length === 0) {
          const seeded = [makeStep()];
          setSteps(seeded);
          track(syncStepsOrder(id, seeded)).catch(() => {});
        } else {
          setSteps(loaded);
        }
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -----------------------------------------------------------------
  // Process-level fields
  // -----------------------------------------------------------------
  function persistProcess(fields: {
    name?: string | null;
    description?: string | null;
    version?: string | null;
    goal?: string | null;
    ownerId?: string | null;
  }) {
    if (!id) return;
    track(
      saveProcess(id, {
        name: fields.name !== undefined ? fields.name : name,
        description: fields.description !== undefined ? fields.description : description,
        version: fields.version !== undefined ? fields.version : version,
        goal_description: fields.goal !== undefined ? fields.goal : goal,
        owner_id: fields.ownerId !== undefined ? fields.ownerId : ownerId,
      }),
    ).catch(() => {});
    if (fields.name !== undefined) {
      queryClient.setQueryData<ProcessSummary[]>(["processes"], (old) =>
        old?.map((p) => (p.id === id ? { ...p, name: fields.name ?? null } : p)),
      );
    }
  }

  function handleRenameProcess(value: string | null) {
    setName(value);
    persistProcess({ name: value });
  }

  function handleSaveProcessDetails(fields: {
    description: string | null;
    version: string | null;
    goal: string | null;
    ownerId: string | null;
  }) {
    setDescription(fields.description);
    setVersion(fields.version);
    setGoal(fields.goal);
    setOwnerId(fields.ownerId);
    persistProcess(fields);
  }

  // -----------------------------------------------------------------
  // Step/input/output mutations — each updates local state immediately,
  // then persists the same objects, mirroring index.html's mutate -> render
  // -> sync order.
  // -----------------------------------------------------------------
  function renameStep(stepIdx: number, value: string | null) {
    if (!steps || !id) return;
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, label: value } : s));
    setSteps(next);
    track(syncStepRow(id, next[stepIdx], stepIdx)).catch(() => {});
  }

  function renameInput(stepIdx: number, inputIdx: number, value: string | null) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextInputs = step.inputs.map((inp, i) => (i === inputIdx ? { ...inp, label: value } : inp));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, inputs: nextInputs } : s));
    setSteps(next);
    track(syncInputRow(step.id, nextInputs[inputIdx], inputIdx)).catch(() => {});
  }

  function renameOutput(stepIdx: number, outputIdx: number, value: string | null) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextOutputs = step.outputs.map((out, i) => (i === outputIdx ? { ...out, label: value } : out));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, outputs: nextOutputs } : s));
    setSteps(next);
    track(syncOutputRow(step.id, nextOutputs[outputIdx], outputIdx)).catch(() => {});
  }

  function addStepAfter(stepIdx: number) {
    if (!steps || !id) return;
    const next = [...steps];
    next.splice(stepIdx + 1, 0, makeStep());
    setSteps(next);
    track(syncStepsOrder(id, next)).catch(() => {});
  }

  function removeStep(stepIdx: number) {
    if (!steps || !id) return;
    let removed: SipocStep;
    let next: SipocStep[];
    if (steps.length > 1) {
      next = [...steps];
      removed = next.splice(stepIdx, 1)[0];
    } else {
      removed = steps[0];
      next = [makeStep()];
    }
    setSteps(next);
    track(deleteStepRow(removed.id).then(() => syncStepsOrder(id, next))).catch(() => {});
  }

  function addInput(stepIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextInputs = [...step.inputs, makeInput()];
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, inputs: nextInputs } : s));
    setSteps(next);
    track(syncInputsOrder(step.id, nextInputs)).catch(() => {});
  }

  function removeInput(stepIdx: number, inputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextInputs = [...step.inputs];
    const removed = nextInputs.splice(inputIdx, 1)[0];
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, inputs: nextInputs } : s));
    setSteps(next);
    track(deleteInputRow(removed.id).then(() => syncInputsOrder(step.id, nextInputs))).catch(() => {});
  }

  function addSupplier(stepIdx: number, inputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextInputs = step.inputs.map((inp, i) => (i === inputIdx ? { ...inp, supplier: makeParty() } : inp));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, inputs: nextInputs } : s));
    setSteps(next);
    track(syncInputRow(step.id, nextInputs[inputIdx], inputIdx)).catch(() => {});
  }

  function removeSupplier(stepIdx: number, inputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextInputs = step.inputs.map((inp, i) => (i === inputIdx ? { ...inp, supplier: null } : inp));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, inputs: nextInputs } : s));
    setSteps(next);
    track(syncInputRow(step.id, nextInputs[inputIdx], inputIdx)).catch(() => {});
  }

  function addOutput(stepIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextOutputs = [...step.outputs, makeOutput()];
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, outputs: nextOutputs } : s));
    setSteps(next);
    track(syncOutputsOrder(step.id, nextOutputs)).catch(() => {});
  }

  function removeOutput(stepIdx: number, outputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextOutputs = [...step.outputs];
    const removed = nextOutputs.splice(outputIdx, 1)[0];
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, outputs: nextOutputs } : s));
    setSteps(next);
    track(deleteOutputRow(removed.id).then(() => syncOutputsOrder(step.id, nextOutputs))).catch(() => {});
  }

  function addCustomer(stepIdx: number, outputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextOutputs = step.outputs.map((out, i) => (i === outputIdx ? { ...out, customer: makeParty() } : out));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, outputs: nextOutputs } : s));
    setSteps(next);
    track(syncOutputRow(step.id, nextOutputs[outputIdx], outputIdx)).catch(() => {});
  }

  function removeCustomer(stepIdx: number, outputIdx: number) {
    if (!steps) return;
    const step = steps[stepIdx];
    const nextOutputs = step.outputs.map((out, i) => (i === outputIdx ? { ...out, customer: null } : out));
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, outputs: nextOutputs } : s));
    setSteps(next);
    track(syncOutputRow(step.id, nextOutputs[outputIdx], outputIdx)).catch(() => {});
  }

  // -----------------------------------------------------------------
  // Detail-modal saves
  // -----------------------------------------------------------------
  function saveStepDetails(
    stepIdx: number,
    fields: { instructions: string | null; functionId: string | null; isDecision: boolean },
  ) {
    if (!steps || !id) return;
    const next = steps.map((s, i) => (i === stepIdx ? { ...s, ...fields } : s));
    setSteps(next);
    track(syncStepRow(id, next[stepIdx], stepIdx)).catch(() => {});
  }

  function saveFieldDetails(
    target: FieldTarget,
    fields: { label: string | null; communicationTypeId: string | null },
  ) {
    if (!steps) return;
    const step = steps[target.stepIdx];
    if (target.kind === "input") {
      const nextInputs = step.inputs.map((inp, i) => (i === target.idx ? { ...inp, ...fields } : inp));
      const next = steps.map((s, i) => (i === target.stepIdx ? { ...s, inputs: nextInputs } : s));
      setSteps(next);
      track(syncInputRow(step.id, nextInputs[target.idx], target.idx)).catch(() => {});
    } else {
      const nextOutputs = step.outputs.map((out, i) => (i === target.idx ? { ...out, ...fields } : out));
      const next = steps.map((s, i) => (i === target.stepIdx ? { ...s, outputs: nextOutputs } : s));
      setSteps(next);
      track(syncOutputRow(step.id, nextOutputs[target.idx], target.idx)).catch(() => {});
    }
  }

  function savePartyDetails(target: PartyTarget, party: PartyRef) {
    if (!steps) return;
    const step = steps[target.stepIdx];
    if (target.kind === "supplier") {
      const nextInputs = step.inputs.map((inp, i) => (i === target.idx ? { ...inp, supplier: party } : inp));
      const next = steps.map((s, i) => (i === target.stepIdx ? { ...s, inputs: nextInputs } : s));
      setSteps(next);
      track(syncInputRow(step.id, nextInputs[target.idx], target.idx)).catch(() => {});
    } else {
      const nextOutputs = step.outputs.map((out, i) => (i === target.idx ? { ...out, customer: party } : out));
      const next = steps.map((s, i) => (i === target.stepIdx ? { ...s, outputs: nextOutputs } : s));
      setSteps(next);
      track(syncOutputRow(step.id, nextOutputs[target.idx], target.idx)).catch(() => {});
    }
  }

  const actions: BoardActions = {
    renameStep,
    renameInput,
    renameOutput,
    addStepAfter,
    removeStep,
    addInput,
    removeInput,
    addSupplier,
    removeSupplier,
    addOutput,
    removeOutput,
    addCustomer,
    removeCustomer,
    openStepModal: (stepIdx) => setStepModalIdx(stepIdx),
    openFieldModal: (kind, stepIdx, idx) => setFieldModal({ kind, stepIdx, idx }),
    openPartyModal: (kind, stepIdx, idx) => setPartyModal({ kind, stepIdx, idx }),
  };

  if (processLoading) {
    return <div className="p-8 text-sm text-grey-text">Proces laden…</div>;
  }
  if (isError || !processRecord) {
    return (
      <div className="p-8 text-sm text-danger">
        Kon dit proces niet laden{error ? `: ${(error as Error).message}` : "."}
      </div>
    );
  }

  const isOwner = !!user && (processRecord.created_by === null || processRecord.created_by === user.id);
  const editable = !!canEdit;

  return (
    <div style={{ padding: "28px 24px 80px" }}>
      <ProcessHeader
        name={name}
        canEdit={editable}
        syncStatus={syncStatus}
        onRename={handleRenameProcess}
        onOpenDetails={() => setProcessModalOpen(true)}
      />

      {steps ? (
        <Board
          steps={steps}
          canEdit={editable}
          functionsList={functionsList}
          externalPartiesList={externalPartiesList}
          actions={actions}
        />
      ) : (
        <div className="board-wrap py-16 text-center text-sm text-grey-text">Bord laden…</div>
      )}

      <footer className="board-footer">Herkomst &middot; Input &middot; Activiteit &middot; Output &middot; Bestemming</footer>

      {stepModalIdx !== null && steps && steps[stepModalIdx] && (
        <StepModal
          step={steps[stepModalIdx]}
          onClose={() => setStepModalIdx(null)}
          onSave={(fields) => saveStepDetails(stepModalIdx, fields)}
        />
      )}

      {fieldModal && steps && steps[fieldModal.stepIdx] && (
        <FieldModal
          entity={
            fieldModal.kind === "input"
              ? steps[fieldModal.stepIdx].inputs[fieldModal.idx]
              : steps[fieldModal.stepIdx].outputs[fieldModal.idx]
          }
          columnLabel={fieldModal.kind === "input" ? "Input" : "Output"}
          onClose={() => setFieldModal(null)}
          onSave={(fields) => saveFieldDetails(fieldModal, fields)}
        />
      )}

      {partyModal && steps && steps[partyModal.stepIdx] && (
        <PartyModal
          party={
            (partyModal.kind === "supplier"
              ? steps[partyModal.stepIdx].inputs[partyModal.idx].supplier
              : steps[partyModal.stepIdx].outputs[partyModal.idx].customer) ?? makeParty()
          }
          columnLabel={partyModal.kind === "supplier" ? "Supplier" : "Customer"}
          currentProcessId={id!}
          onClose={() => setPartyModal(null)}
          onSave={(party) => savePartyDetails(partyModal, party)}
        />
      )}

      {processModalOpen && id && (
        <ProcessModal
          processId={id}
          name={name}
          description={description}
          version={version}
          goal={goal}
          ownerId={ownerId}
          isOwner={isOwner}
          onClose={() => setProcessModalOpen(false)}
          onSave={handleSaveProcessDetails}
        />
      )}
    </div>
  );
}
