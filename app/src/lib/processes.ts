import { supabase } from "./supabaseClient";
import type { ProcessRecord, ProcessSummary } from "./types";

export async function fetchProcessList(): Promise<ProcessSummary[]> {
  const { data, error } = await supabase
    .from("processes")
    .select("id,name,created_by");
  if (error) throw error;
  return data ?? [];
}

export async function fetchProcess(id: string): Promise<ProcessRecord> {
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Owner or an explicitly invited editor may edit; everyone else is read-only. */
export async function canEditProcess(
  proc: Pick<ProcessRecord, "id" | "created_by">,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  if (proc.created_by === null || proc.created_by === userId) return true;
  const { data, error } = await supabase
    .from("process_editors")
    .select("user_id")
    .eq("process_id", proc.id)
    .eq("user_id", userId);
  if (error) throw error;
  return !!(data && data.length);
}

export async function createProcess(userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const stepId = crypto.randomUUID();
  const { error: procError } = await supabase
    .from("processes")
    .insert({ id, name: null, version: "0.1", created_by: userId });
  if (procError) throw procError;
  const { error: stepError } = await supabase
    .from("sipoc_steps")
    .insert({ id: stepId, process_id: id, position: 0, label: null });
  if (stepError) throw stepError;
  return id;
}

export async function deleteProcess(id: string): Promise<void> {
  const { error } = await supabase.from("processes").delete().eq("id", id);
  if (error) throw error;
}
