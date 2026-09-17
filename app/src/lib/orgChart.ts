import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------
// Organogram: één gedeelde boom van afdelingen (org_departments), los
// van de SIPOC-processen. parent_id = null is de altijd-aanwezige
// bovenste afdeling (aangemaakt via migratie, nooit door de app zelf).
// ---------------------------------------------------------------------

interface DepartmentRow {
  id: string;
  parent_id: string | null;
  position: number;
  label: string | null;
}

export interface OrgNode {
  id: string;
  label: string | null;
  children: OrgNode[];
}

export async function fetchOrgTree(): Promise<OrgNode> {
  const { data, error } = await supabase
    .from("org_departments")
    .select("id,parent_id,position,label")
    .order("position");
  if (error) throw error;
  const rows = (data ?? []) as DepartmentRow[];

  const byId = new Map<string, OrgNode>();
  rows.forEach((r) => byId.set(r.id, { id: r.id, label: r.label, children: [] }));
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
export async function addDepartment(id: string, parentId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("org_departments")
    .insert({ id, parent_id: parentId, position, label: null });
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
