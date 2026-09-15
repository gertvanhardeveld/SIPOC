import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------
// The SIPOC board's data shape, ported 1:1 from the in-memory `state`
// object in index.html — five nested collections (steps -> inputs/
// outputs -> supplier/customer), addressed by array position, synced to
// Supabase one row at a time.
// ---------------------------------------------------------------------

export interface PartyRef {
  id: string;
  label: string | null;
  kind: "intern" | "extern" | null;
  functionId: string | null;
  externalId: string | null;
}

export interface StepInput {
  id: string;
  label: string | null;
  communicationTypeId: string | null;
  supplier: PartyRef | null;
}

export interface StepOutput {
  id: string;
  label: string | null;
  communicationTypeId: string | null;
  customer: PartyRef | null;
}

export interface SipocStep {
  id: string;
  label: string | null;
  instructions: string | null;
  functionId: string | null;
  inputs: StepInput[];
  outputs: StepOutput[];
  /** AO-online-stijl: een beslissing-processtap wordt rood weergegeven. */
  isDecision: boolean;
}

export interface MasterItem {
  id: string;
  name: string;
}

export function makeId(): string {
  return crypto.randomUUID();
}

export function makeStep(): SipocStep {
  return { id: makeId(), label: null, instructions: null, functionId: null, inputs: [], outputs: [], isDecision: false };
}
export function makeInput(): StepInput {
  return { id: makeId(), label: null, communicationTypeId: null, supplier: null };
}
export function makeOutput(): StepOutput {
  return { id: makeId(), label: null, communicationTypeId: null, customer: null };
}
export function makeParty(): PartyRef {
  return { id: makeId(), label: null, kind: null, functionId: null, externalId: null };
}

/** What a supplier/customer rectangle should show: the chosen function's
 * (intern) or external party's (extern) name wins once set; falls back to
 * the free-typed label otherwise (older data, or a type chosen but nothing
 * specific picked yet). */
export function partyResolvedLabel(
  party: PartyRef | null,
  functionsList: MasterItem[],
  externalPartiesList: MasterItem[],
): string | null {
  if (!party) return null;
  if (party.kind === "intern" && party.functionId) {
    const fn = functionsList.find((f) => f.id === party.functionId);
    if (fn) return fn.name;
  }
  if (party.kind === "extern" && party.externalId) {
    const ep = externalPartiesList.find((p) => p.id === party.externalId);
    if (ep) return ep.name;
  }
  return party.label;
}

export async function loadSteps(processId: string): Promise<SipocStep[]> {
  const { data: stepsRows, error: stepsError } = await supabase
    .from("sipoc_steps")
    .select("*")
    .eq("process_id", processId)
    .order("position");
  if (stepsError) throw stepsError;
  const rows = stepsRows ?? [];

  const stepIds = rows.map((s) => s.id);
  const inputsPromise = stepIds.length
    ? supabase.from("sipoc_inputs").select("*").in("step_id", stepIds).order("position")
    : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });
  const outputsPromise = stepIds.length
    ? supabase.from("sipoc_outputs").select("*").in("step_id", stepIds).order("position")
    : Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

  const [inputsRes, outputsRes] = await Promise.all([inputsPromise, outputsPromise]);
  if (inputsRes.error) throw inputsRes.error;
  if (outputsRes.error) throw outputsRes.error;
  const inputsRows = inputsRes.data ?? [];
  const outputsRows = outputsRes.data ?? [];

  return rows.map((row): SipocStep => ({
    id: row.id,
    label: row.label,
    instructions: row.instructions,
    functionId: row.function_id,
    isDecision: !!row.is_decision,
    inputs: inputsRows
      .filter((i) => i.step_id === row.id)
      .map((i): StepInput => ({
        id: i.id,
        label: i.label,
        communicationTypeId: i.communication_type_id,
        supplier:
          i.supplier_label === null
            ? null
            : {
                id: makeId(),
                label: i.supplier_label,
                kind: i.supplier_kind,
                functionId: i.supplier_function_id,
                externalId: i.supplier_external_id,
              },
      })),
    outputs: outputsRows
      .filter((o) => o.step_id === row.id)
      .map((o): StepOutput => ({
        id: o.id,
        label: o.label,
        communicationTypeId: o.communication_type_id,
        customer:
          o.customer_label === null
            ? null
            : {
                id: makeId(),
                label: o.customer_label,
                kind: o.customer_kind,
                functionId: o.customer_function_id,
                externalId: o.customer_external_id,
              },
      })),
  }));
}

export async function syncStepRow(processId: string, step: SipocStep, position: number): Promise<void> {
  const { error } = await supabase.from("sipoc_steps").upsert({
    id: step.id,
    process_id: processId,
    position,
    label: step.label,
    instructions: step.instructions,
    function_id: step.functionId,
    is_decision: step.isDecision,
  });
  if (error) throw error;
}

export async function syncStepsOrder(processId: string, steps: SipocStep[]): Promise<void> {
  await Promise.all(steps.map((step, i) => syncStepRow(processId, step, i)));
}

function inputRow(input: StepInput, position: number, stepId: string) {
  return {
    id: input.id,
    step_id: stepId,
    position,
    label: input.label,
    supplier_label: input.supplier ? input.supplier.label || "" : null,
    supplier_kind: input.supplier ? input.supplier.kind : null,
    supplier_function_id: input.supplier ? input.supplier.functionId : null,
    supplier_external_id: input.supplier ? input.supplier.externalId : null,
    communication_type_id: input.communicationTypeId,
  };
}

function outputRow(output: StepOutput, position: number, stepId: string) {
  return {
    id: output.id,
    step_id: stepId,
    position,
    label: output.label,
    customer_label: output.customer ? output.customer.label || "" : null,
    customer_kind: output.customer ? output.customer.kind : null,
    customer_function_id: output.customer ? output.customer.functionId : null,
    customer_external_id: output.customer ? output.customer.externalId : null,
    communication_type_id: output.communicationTypeId,
  };
}

export async function syncInputRow(stepId: string, input: StepInput, position: number): Promise<void> {
  const { error } = await supabase.from("sipoc_inputs").upsert(inputRow(input, position, stepId));
  if (error) throw error;
}
export async function syncInputsOrder(stepId: string, inputs: StepInput[]): Promise<void> {
  await Promise.all(inputs.map((input, i) => syncInputRow(stepId, input, i)));
}

export async function syncOutputRow(stepId: string, output: StepOutput, position: number): Promise<void> {
  const { error } = await supabase.from("sipoc_outputs").upsert(outputRow(output, position, stepId));
  if (error) throw error;
}
export async function syncOutputsOrder(stepId: string, outputs: StepOutput[]): Promise<void> {
  await Promise.all(outputs.map((output, i) => syncOutputRow(stepId, output, i)));
}

export async function deleteStepRow(id: string): Promise<void> {
  const { error } = await supabase.from("sipoc_steps").delete().eq("id", id);
  if (error) throw error;
}
export async function deleteInputRow(id: string): Promise<void> {
  const { error } = await supabase.from("sipoc_inputs").delete().eq("id", id);
  if (error) throw error;
}
export async function deleteOutputRow(id: string): Promise<void> {
  const { error } = await supabase.from("sipoc_outputs").delete().eq("id", id);
  if (error) throw error;
}
