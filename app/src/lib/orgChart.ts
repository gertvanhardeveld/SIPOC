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

export async function addDepartment(parentId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("org_departments")
    .insert({ id: crypto.randomUUID(), parent_id: parentId, position, label: null });
  if (error) throw error;
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
