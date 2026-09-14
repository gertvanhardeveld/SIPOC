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

export interface ProcessSaveFields {
  name: string | null;
  description: string | null;
  version: string | null;
  goal_description: string | null;
  owner_id: string | null;
}

export async function saveProcess(id: string, fields: ProcessSaveFields): Promise<void> {
  const { error } = await supabase
    .from("processes")
    .upsert({ id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export interface ProcessEditor {
  user_id: string;
  email: string;
}

/** Who (besides the owner) may edit this process — distinct from the
 * business-level "proceseigenaar" field. Only the owner (created_by)
 * manages this list; `profiles` exists so a user can be looked up by
 * e-mail without querying auth.users directly (the client can't). */
export async function fetchProcessEditors(processId: string): Promise<ProcessEditor[]> {
  const { data, error } = await supabase
    .from("process_editors")
    .select("user_id")
    .eq("process_id", processId);
  if (error) throw error;
  const userIds = (data ?? []).map((r) => r.user_id as string);
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  return userIds.map((uid) => {
    const profile = (profiles ?? []).find((p) => p.id === uid);
    return { user_id: uid, email: profile ? profile.email : uid };
  });
}

export type AddEditorResult = "ok" | "not_found" | "empty";

export async function addProcessEditorByEmail(processId: string, email: string): Promise<AddEditorResult> {
  const trimmed = email.trim();
  if (!trimmed) return "empty";
  const { data, error } = await supabase.from("profiles").select("id").ilike("email", trimmed);
  if (error) throw error;
  if (!data || !data.length) return "not_found";
  const { error: insertError } = await supabase
    .from("process_editors")
    .insert({ process_id: processId, user_id: data[0].id });
  if (insertError) throw insertError;
  return "ok";
}

export async function removeProcessEditor(processId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("process_editors")
    .delete()
    .eq("process_id", processId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Every process id the given user is on the editors list for — used by
 * the access overview (/toegang) to tell "Bewerker" apart from
 * "Alleen-lezen" across the whole process list in one query, instead of
 * checking each process individually. */
export async function fetchEditableProcessIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("process_editors").select("process_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.process_id as string);
}
