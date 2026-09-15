import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------
// "Procesketens": hoe processen via gekoppelde activiteiten aan elkaar
// hangen. Elke activiteit-verwijzing (zie board.ts, PartyRef.internalType
// === "activiteit") tekent één lijn tussen twee activiteiten in twee
// verschillende processen. Omdat zo'n verwijzing dankzij de wederzijdse
// koppeling altijd aan beide kanten bestaat (een output bij de ene
// activiteit, een input bij de andere), lezen we hier gewoon alle
// activiteit-typerende outputs én inputs uit de hele database (niet per
// proces — dit overzicht kijkt dwars door alle processen heen) en voegen
// de twee kanten samen tot één ongerichte verbinding.
// ---------------------------------------------------------------------

export interface ChainNode {
  /** = de sipoc_steps.id van deze activiteit. */
  id: string;
  processId: string;
  processName: string | null;
  stepLabel: string | null;
}

export interface ChainEdge {
  id: string;
  fromStepId: string;
  toStepId: string;
  /** De naam van de input/output die deze twee activiteiten verbindt. */
  label: string | null;
}

export interface ProcessChainGraph {
  nodes: ChainNode[];
  edges: ChainEdge[];
}

interface RawStep {
  id: string;
  label: string | null;
  process_id: string;
}
interface RawProcess {
  id: string;
  name: string | null;
}
interface RawLink {
  step_id: string;
  label: string | null;
  other_step_id: string;
}

async function fetchAllProcesses(): Promise<RawProcess[]> {
  const { data, error } = await supabase.from("processes").select("id,name");
  if (error) throw error;
  return data ?? [];
}

async function fetchAllSteps(): Promise<RawStep[]> {
  const { data, error } = await supabase.from("sipoc_steps").select("id,label,process_id");
  if (error) throw error;
  return data ?? [];
}

/** Outputs die naar een activiteit verwijzen: de link loopt van deze
 * output se eigen stap náár customer_step_id. */
async function fetchOutputActivityLinks(): Promise<RawLink[]> {
  const { data, error } = await supabase
    .from("sipoc_outputs")
    .select("step_id,label,customer_step_id")
    .eq("customer_internal_type", "activiteit")
    .not("customer_step_id", "is", null);
  if (error) throw error;
  return (data ?? []).map((r) => ({ step_id: r.step_id, label: r.label, other_step_id: r.customer_step_id as string }));
}

/** Inputs die naar een activiteit verwijzen: de link loopt van
 * supplier_step_id náár deze input se eigen stap. */
async function fetchInputActivityLinks(): Promise<RawLink[]> {
  const { data, error } = await supabase
    .from("sipoc_inputs")
    .select("step_id,label,supplier_step_id")
    .eq("supplier_internal_type", "activiteit")
    .not("supplier_step_id", "is", null);
  if (error) throw error;
  return (data ?? []).map((r) => ({ step_id: r.supplier_step_id as string, label: r.label, other_step_id: r.step_id }));
}

/** Bouwt de volledige procesketens-graaf. Elke echte koppeling levert
 * normaliter twee rijen op (de output-kant en de wederzijdse input-kant,
 * zie board.ts) — die worden hier samengevoegd tot één rand; bestaat er
 * (bv. door een mislukte spiegel-sync) maar één kant, dan komt die ene
 * kant alsnog gewoon in beeld. */
export async function fetchProcessChainGraph(): Promise<ProcessChainGraph> {
  const [processes, steps, outputLinks, inputLinks] = await Promise.all([
    fetchAllProcesses(),
    fetchAllSteps(),
    fetchOutputActivityLinks(),
    fetchInputActivityLinks(),
  ]);

  const stepById = new Map(steps.map((s) => [s.id, s]));
  const processNameById = new Map(processes.map((p) => [p.id, p.name]));

  const edgesByKey = new Map<string, ChainEdge>();
  for (const link of [...outputLinks, ...inputLinks]) {
    const a = stepById.get(link.step_id);
    const b = stepById.get(link.other_step_id);
    if (!a || !b || a.id === b.id) continue; // verwezen stap intussen verwijderd, of iets raars
    const key = [a.id, b.id].sort().join("::");
    if (!edgesByKey.has(key)) {
      edgesByKey.set(key, { id: key, fromStepId: a.id, toStepId: b.id, label: link.label });
    }
  }

  const usedStepIds = new Set<string>();
  for (const edge of edgesByKey.values()) {
    usedStepIds.add(edge.fromStepId);
    usedStepIds.add(edge.toStepId);
  }

  const nodes: ChainNode[] = Array.from(usedStepIds)
    .map((id) => stepById.get(id))
    .filter((s): s is RawStep => !!s)
    .map((s) => ({
      id: s.id,
      processId: s.process_id,
      processName: processNameById.get(s.process_id) ?? null,
      stepLabel: s.label,
    }));

  return { nodes, edges: Array.from(edgesByKey.values()) };
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

/** Simpele, afhankelijkheidsvrije lay-out: per samenhangende component
 * (via BFS) een compact raster, componenten naast elkaar tot een
 * rijbreedte vol is en dan een nieuwe rij. Voor het meest voorkomende
 * geval — twee gekoppelde activiteiten — levert dit vanzelf een net
 * paar naast elkaar op, zoals in het voorbeeld. */
export function layoutChainNodes(nodes: ChainNode[], edges: ChainEdge[]): PositionedNode[] {
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((n) => adjacency.set(n.id, new Set()));
  edges.forEach((e) => {
    adjacency.get(e.fromStepId)?.add(e.toStepId);
    adjacency.get(e.toStepId)?.add(e.fromStepId);
  });

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const queue = [node.id];
    visited.add(node.id);
    const component: string[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  const NODE_W = 240;
  const NODE_H = 110;
  const GAP_X = 80;
  const GAP_Y = 60;
  const COMPONENT_GAP = 100;
  const MAX_ROW_WIDTH = 1400;

  const positions: PositionedNode[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxHeight = 0;

  for (const component of components) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(component.length)));
    const rows = Math.ceil(component.length / cols);
    const width = cols * (NODE_W + GAP_X);
    const height = rows * (NODE_H + GAP_Y);

    if (cursorX > 0 && cursorX + width > MAX_ROW_WIDTH) {
      cursorX = 0;
      cursorY += rowMaxHeight + COMPONENT_GAP;
      rowMaxHeight = 0;
    }

    component.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({ id, x: cursorX + col * (NODE_W + GAP_X), y: cursorY + row * (NODE_H + GAP_Y) });
    });

    cursorX += width + COMPONENT_GAP;
    rowMaxHeight = Math.max(rowMaxHeight, height);
  }

  return positions;
}
