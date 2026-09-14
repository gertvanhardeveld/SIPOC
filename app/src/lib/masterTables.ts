import { supabase } from "./supabaseClient";
import { makeId, type MasterItem } from "./board";

/** The four shared "stamtabellen" — master lists reused across every
 * process, each with the same shape ({id, name}) and the same CRUD. */
export type MasterTable = "functions" | "external_parties" | "communication_types" | "process_owners";

export async function fetchMasterTable(table: MasterTable): Promise<MasterItem[]> {
  const { data, error } = await supabase.from(table).select("id,name");
  if (error) throw error;
  return (data ?? []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "nl", { sensitivity: "base" }));
}

export async function createMasterItem(table: MasterTable, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const id = makeId();
  const { error } = await supabase.from(table).insert({ id, name: trimmed });
  if (error) throw error;
  return id;
}

export async function deleteMasterItem(table: MasterTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
