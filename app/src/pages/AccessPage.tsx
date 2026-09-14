import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import { fetchEditableProcessIds, fetchProcessList } from "../lib/processes";
import type { ProcessSummary } from "../lib/types";
import ProcessEditorsField from "../components/ProcessEditorsField";

type Role = "eigenaar" | "bewerker" | "open" | "alleen-lezen";

const ROLE_LABEL: Record<Role, string> = {
  eigenaar: "Eigenaar",
  bewerker: "Bewerker",
  open: "Open (legacy)",
  "alleen-lezen": "Alleen-lezen",
};

const ROLE_CLASS: Record<Role, string> = {
  eigenaar: "bg-accent text-white",
  bewerker: "bg-accent-bg text-accent",
  open: "border border-dashed border-grey-box-border text-grey-text",
  "alleen-lezen": "bg-grey-box text-grey-text",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${ROLE_CLASS[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Overzicht van alle processen met, per proces, wie jij daarin bent
 * (eigenaar / bewerker / alleen-lezen / open legacy-proces) — en voor elk
 * proces dat je mag beheren, de bewerkerslijst direct hier bewerkbaar in
 * plaats van elk proces apart te moeten openen. Rechten zelf (wie mag wat)
 * zaten al vanaf fase 3/4 in het bord (alleen-lezen-badge, verborgen
 * knoppen); dit scherm is het overzicht daar los van. */
export default function AccessPage() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: fetchProcessList,
  });

  const { data: editableIds = [] } = useQuery({
    queryKey: ["editable-process-ids", user?.id],
    queryFn: () => fetchEditableProcessIds(user!.id),
    enabled: !!user,
  });

  const rows = useMemo(() => {
    return processes
      .map((p: ProcessSummary) => {
        let role: Role;
        let canManageEditors: boolean;
        if (user && p.created_by === user.id) {
          role = "eigenaar";
          canManageEditors = true;
        } else if (p.created_by === null) {
          role = "open";
          canManageEditors = !!user;
        } else if (editableIds.includes(p.id)) {
          role = "bewerker";
          canManageEditors = false;
        } else {
          role = "alleen-lezen";
          canManageEditors = false;
        }
        return { process: p, role, canManageEditors };
      })
      .sort((a, b) => (a.process.name || "").localeCompare(b.process.name || "", "nl", { sensitivity: "base" }));
  }, [processes, editableIds, user]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Toegang</h1>
        <p className="text-[12.5px] text-grey-text">Wie mag welk proces bewerken.</p>
      </header>

      <div className="mb-6 space-y-1.5 rounded-lg border border-border bg-panel p-4 text-[12.5px] text-grey-text">
        <p>
          <strong className="text-dark-text">Eigenaar</strong> — heeft het proces aangemaakt en bepaalt wie het
          verder mag bewerken.
        </p>
        <p>
          <strong className="text-dark-text">Bewerker</strong> — door de eigenaar toegevoegd, mag het proces
          aanpassen.
        </p>
        <p>
          <strong className="text-dark-text">Open (legacy)</strong> — een proces zonder eigenaar (van vóór er
          accounts waren); iedereen die is ingelogd mag het bewerken en bewerkers beheren, tot iemand het claimt.
        </p>
        <p>
          <strong className="text-dark-text">Alleen-lezen</strong> — je mag het proces bekijken, maar niet
          aanpassen.
        </p>
      </div>

      {isLoading ? (
        <p className="text-[12.5px] text-grey-text">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-grey-text">Nog geen processen.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-panel">
          {rows.map(({ process, role, canManageEditors }) => {
            const expanded = expandedId === process.id;
            return (
              <div key={process.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/proces/${process.id}`} className="min-w-0 truncate font-medium hover:text-accent">
                    {process.name || <span className="italic text-grey-text">Procesnaam</span>}
                  </Link>
                  <RoleBadge role={role} />
                </div>
                {canManageEditors && (
                  <>
                    <button
                      type="button"
                      className="mt-2 text-[12px] text-accent hover:underline"
                      onClick={() => setExpandedId(expanded ? null : process.id)}
                    >
                      {expanded ? "Bewerkers verbergen" : "Bewerkers beheren"}
                    </button>
                    {expanded && (
                      <div className="mt-3">
                        <ProcessEditorsField processId={process.id} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
