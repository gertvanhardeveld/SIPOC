export interface ProcessSummary {
  id: string;
  name: string | null;
  created_by: string | null;
}

export interface ProcessRecord {
  id: string;
  name: string | null;
  description: string | null;
  version: string | null;
  goal_description: string | null;
  owner_id: string | null;
  created_by: string | null;
}
