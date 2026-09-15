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
  /** Alleen relevant bij kind === "intern": verwijst dit naar een functie,
   * of naar een activiteit in een (ander) proces? */
  internalType: "functie" | "activiteit" | null;
  functionId: string | null;
  externalId: string | null;
  /** Alleen relevant bij internalType === "activiteit": de verwezen
   * sipoc_steps.id — kan in elk proces liggen, niet per se dit proces. */
  stepId: string | null;
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
  return { id: makeId(), label: null, kind: null, internalType: null, functionId: null, externalId: null, stepId: null };
}

/** What a supplier/customer rectangle should show: the chosen function's
 * (intern → functie) or activiteit's (intern → activiteit) or external
 * party's (extern) name wins once set; falls back to the free-typed label
 * otherwise (older data, or a type chosen but nothing specific picked
 * yet). `stepsList` is the step list of whichever process is currently
 * selected in the "Procesactiviteit"-picker — it only needs to resolve
 * the one step being referenced, not every process's steps. */
export function partyResolvedLabel(
  party: PartyRef | null,
  functionsList: MasterItem[],
  externalPartiesList: MasterItem[],
  stepsList: MasterItem[] = [],
): string | null {
  if (!party) return null;
  if (party.kind === "intern" && party.internalType === "functie" && party.functionId) {
    const fn = functionsList.find((f) => f.id === party.functionId);
    if (fn) return fn.name;
  }
  if (party.kind === "intern" && party.internalType === "activiteit" && party.stepId) {
    const st = stepsList.find((s) => s.id === party.stepId);
    if (st) return st.name;
  }
  if (party.kind === "extern" && party.externalId) {
    const ep = externalPartiesList.find((p) => p.id === party.externalId);
    if (ep) return ep.name;
  }
  return party.label;
}

/** Alle activiteiten (id + label) van één proces, voor de
 * "Procesactiviteit"-picker in PartyModal. */
export async function fetchStepsForProcess(processId: string): Promise<MasterItem[]> {
  const { data, error } = await supabase
    .from("sipoc_steps")
    .select("id,label")
    .eq("process_id", processId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.label || "Naamloze processtap" }));
}

/** Welk proces een gegeven stap-id bij hoort — gebruikt om, bij het openen
 * van een bestaande "activiteit"-verwijzing, de processelector in
 * PartyModal alvast op het juiste proces te zetten. */
export async function fetchStepProcessId(stepId: string): Promise<string | null> {
  const { data, error } = await supabase.from("sipoc_steps").select("process_id").eq("id", stepId).maybeSingle();
  if (error) throw error;
  return data?.process_id ?? null;
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
                internalType: i.supplier_internal_type ?? null,
                functionId: i.supplier_function_id,
                externalId: i.supplier_external_id,
                stepId: i.supplier_step_id ?? null,
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
                internalType: o.customer_internal_type ?? null,
                functionId: o.customer_function_id,
                externalId: o.customer_external_id,
                stepId: o.customer_step_id ?? null,
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
    supplier_internal_type: input.supplier ? input.supplier.internalType : null,
    supplier_function_id: input.supplier ? input.supplier.functionId : null,
    supplier_external_id: input.supplier ? input.supplier.externalId : null,
    supplier_step_id: input.supplier ? input.supplier.stepId : null,
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
    customer_internal_type: output.customer ? output.customer.internalType : null,
    customer_function_id: output.customer ? output.customer.functionId : null,
    customer_external_id: output.customer ? output.customer.externalId : null,
    customer_step_id: output.customer ? output.customer.stepId : null,
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

// ---------------------------------------------------------------------
// Wederzijdse koppeling voor "activiteit"-verwijzingen: een output die
// naar een activiteit in een ander proces wijst, is voor die andere
// activiteit een input (en andersom). Het instellen, verplaatsen of
// verwijderen van zo'n verwijzing houdt de andere kant automatisch
// gelijk — de gebruiker hoeft niet twee keer hetzelfde in te voeren.
// ---------------------------------------------------------------------

interface ReciprocalRef {
  targetStepId: string;
  fromStepId: string;
  fromStepLabel: string | null;
  label: string | null;
}

async function findReciprocal(
  table: "sipoc_inputs" | "sipoc_outputs",
  side: "supplier" | "customer",
  targetStepId: string,
  fromStepId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("step_id", targetStepId)
    .eq(`${side}_kind`, "intern")
    .eq(`${side}_internal_type`, "activiteit")
    .eq(`${side}_step_id`, fromStepId)
    .order("position")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** De andere activiteit krijgt (of behoudt) een input wiens herkomst
 * terugwijst naar `fromStepId` — aangeroepen wanneer een output-blokje
 * op een activiteit-verwijzing gezet of gewijzigd wordt. */
export async function syncReciprocalInput(ref: ReciprocalRef): Promise<void> {
  const existing = await findReciprocal("sipoc_inputs", "supplier", ref.targetStepId, ref.fromStepId);
  const row = {
    label: ref.label,
    supplier_label: ref.fromStepLabel || "",
    supplier_kind: "intern",
    supplier_internal_type: "activiteit",
    supplier_step_id: ref.fromStepId,
    supplier_function_id: null,
    supplier_external_id: null,
  };
  if (existing) {
    const { error } = await supabase.from("sipoc_inputs").update(row).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { count, error: countError } = await supabase
    .from("sipoc_inputs")
    .select("id", { count: "exact", head: true })
    .eq("step_id", ref.targetStepId);
  if (countError) throw countError;
  const { error } = await supabase
    .from("sipoc_inputs")
    .insert({ id: makeId(), step_id: ref.targetStepId, position: count ?? 0, communication_type_id: null, ...row });
  if (error) throw error;
}

/** De andere activiteit krijgt (of behoudt) een output wiens bestemming
 * terugwijst naar `fromStepId` — het spiegelbeeld van
 * `syncReciprocalInput`, voor wanneer een input-blokje op een
 * activiteit-verwijzing gezet of gewijzigd wordt. */
export async function syncReciprocalOutput(ref: ReciprocalRef): Promise<void> {
  const existing = await findReciprocal("sipoc_outputs", "customer", ref.targetStepId, ref.fromStepId);
  const row = {
    label: ref.label,
    customer_label: ref.fromStepLabel || "",
    customer_kind: "intern",
    customer_internal_type: "activiteit",
    customer_step_id: ref.fromStepId,
    customer_function_id: null,
    customer_external_id: null,
  };
  if (existing) {
    const { error } = await supabase.from("sipoc_outputs").update(row).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { count, error: countError } = await supabase
    .from("sipoc_outputs")
    .select("id", { count: "exact", head: true })
    .eq("step_id", ref.targetStepId);
  if (countError) throw countError;
  const { error } = await supabase
    .from("sipoc_outputs")
    .insert({ id: makeId(), step_id: ref.targetStepId, position: count ?? 0, communication_type_id: null, ...row });
  if (error) throw error;
}

/** Ruimt een eerder aangemaakte wederzijdse input op — aangeroepen als een
 * output-activiteit-verwijzing verandert of verwijderd wordt. */
export async function removeReciprocalInput(targetStepId: string, fromStepId: string): Promise<void> {
  const existing = await findReciprocal("sipoc_inputs", "supplier", targetStepId, fromStepId);
  if (existing) {
    const { error } = await supabase.from("sipoc_inputs").delete().eq("id", existing.id);
    if (error) throw error;
  }
}

/** Ruimt een eerder aangemaakte wederzijdse output op — het spiegelbeeld
 * van `removeReciprocalInput`. */
export async function removeReciprocalOutput(targetStepId: string, fromStepId: string): Promise<void> {
  const existing = await findReciprocal("sipoc_outputs", "customer", targetStepId, fromStepId);
  if (existing) {
    const { error } = await supabase.from("sipoc_outputs").delete().eq("id", existing.id);
    if (error) throw error;
  }
}
