import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import { canEditProcess, fetchProcess } from "../lib/processes";

export default function ProcessPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    data: process,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["process", id],
    queryFn: () => fetchProcess(id!),
    enabled: !!id,
  });

  const { data: canEdit } = useQuery({
    queryKey: ["can-edit", id, user?.id],
    queryFn: () => canEditProcess(process!, user?.id ?? null),
    enabled: !!process && !!user,
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-grey-text">Proces laden…</div>;
  }
  if (isError || !process) {
    return (
      <div className="p-8 text-sm text-danger">
        Kon dit proces niet laden{error ? `: ${(error as Error).message}` : "."}
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            {process.name || <span className="italic text-grey-text">Naamloos proces</span>}
          </h1>
          <p className="text-[12.5px] text-grey-text">Versie {process.version || "0.1"}</p>
        </div>
        {canEdit === false && (
          <span className="shrink-0 rounded-full bg-grey-box px-3 py-1 text-[11px] font-medium text-grey-text">
            Alleen-lezen
          </span>
        )}
      </header>
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-grey-text">
        Het SIPOC-bord komt in de volgende fase.
      </div>
    </div>
  );
}
