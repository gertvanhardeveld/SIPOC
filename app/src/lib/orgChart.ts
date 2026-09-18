import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------
// Organogram: één gedeelde boom van afdelingen (org_departments), los
// van de SIPOC-processen. parent_id = null is de altijd-aanwezige
// bovenste afdeling (aangemaakt via migratie, nooit door de app zelf).
//
// Twee soorten kinderen: "line" (de gewone kinderrij, van links naar
// rechts uitbreidend) en "staff" (stafafdelingen, die niet in die rij
// zitten maar aan de verticale verbinding ernaartoe hangen — links of
// rechts van die lijn, om en om toegevoegd). `position` betekent voor
// staff "hoe ver van het midden af aan die kant" (0 = dichtstbij), niet
// de plek in de kinderrij.
// ---------------------------------------------------------------------

export type DepartmentKind = "line" | "staff";
export type DepartmentSide = "left" | "right";

interface DepartmentRow {
  id: string;
  parent_id: string | null;
  position: number;
  label: string | null;
  kind: DepartmentKind;
  side: DepartmentSide | null;
}

export interface OrgNode {
  id: string;
  label: string | null;
  kind: DepartmentKind;
  side: DepartmentSide | null;
  /** Bij kind "staff": afstand-vanaf-het-midden index op haar kant
   * (0 = dichtstbij) — niet de plek in de gewone kinderrij. */
  position: number;
  children: OrgNode[];
}

export async function fetchOrgTree(): Promise<OrgNode> {
  const { data, error } = await supabase
    .from("org_departments")
    .select("id,parent_id,position,label,kind,side")
    .order("position");
  if (error) throw error;
  const rows = (data ?? []) as DepartmentRow[];

  const byId = new Map<string, OrgNode>();
  rows.forEach((r) =>
    byId.set(r.id, { id: r.id, label: r.label, kind: r.kind, side: r.side, position: r.position, children: [] }),
  );
  let root: OrgNode | null = null;
  rows.forEach((r) => {
    const node = byId.get(r.id)!;
    if (r.parent_id === null) {
      root = node;
    } else {
      byId.get(r.parent_id)?.children.push(node);
    }
  });
  if (!root) throw new Error("Geen bovenste afdeling gevonden.");
  return root;
}

/** `id` wordt door de aanroeper gegenereerd (niet hier) zodat dezelfde
 * id gebruikt kan worden voor een optimistische lokale toevoeging vóór
 * het netwerkverzoek terugkomt — zie OrgChartPage. */
export async function addDepartment(
  id: string,
  parentId: string,
  position: number,
  kind: DepartmentKind,
  side: DepartmentSide | null,
): Promise<void> {
  const { error } = await supabase
    .from("org_departments")
    .insert({ id, parent_id: parentId, position, label: null, kind, side });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Pure boom-helpers voor optimistische updates: de React Query-cache
// bevat één OrgNode (de root, met geneste children); deze bouwen een
// gewijzigde kopie zonder de server-respons af te wachten.
// ---------------------------------------------------------------------

export function renameNodeInTree(root: OrgNode, id: string, label: string | null): OrgNode {
  if (root.id === id) return { ...root, label };
  return { ...root, children: root.children.map((c) => renameNodeInTree(c, id, label)) };
}

export function addChildInTree(root: OrgNode, parentId: string, child: OrgNode): OrgNode {
  if (root.id === parentId) return { ...root, children: [...root.children, child] };
  return { ...root, children: root.children.map((c) => addChildInTree(c, parentId, child)) };
}

export function removeNodeInTree(root: OrgNode, id: string): OrgNode {
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => removeNodeInTree(c, id)) };
}

/** Volgende kant + positie voor een nieuwe stafafdeling onder `node`:
 * om en om links/rechts, en binnen een kant steeds één verder van het
 * midden af. */
export function nextStaffSlot(node: OrgNode): { side: DepartmentSide; position: number } {
  const staff = node.children.filter((c) => c.kind === "staff");
  const side: DepartmentSide = staff.length % 2 === 0 ? "left" : "right";
  const position = staff.filter((c) => c.side === side).length;
  return { side, position };
}

export async function renameDepartment(id: string, label: string | null): Promise<void> {
  const { error } = await supabase
    .from("org_departments")
    .update({ label, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Verwijdert de afdeling en (via ON DELETE CASCADE) haar hele subboom. */
export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from("org_departments").delete().eq("id", id);
  if (error) throw error;
}
