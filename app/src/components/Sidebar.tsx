import { useMemo, useState, type MouseEvent } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { createProcess, deleteProcess, fetchProcessList } from "../lib/processes";
import type { ProcessSummary } from "../lib/types";

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: fetchProcessList,
  });

  const createMutation = useMutation({
    mutationFn: () => createProcess(user!.id),
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      navigate(`/proces/${newId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProcess(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      if (id === activeId) navigate("/");
    },
  });

  const filtered = useMemo(() => filterAndSortProcesses(processes, search), [processes, search]);

  function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (!window.confirm("Dit proces verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
      return;
    }
    deleteMutation.mutate(id);
  }

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-border bg-panel p-4">
      <h1 className="text-lg font-bold text-header-text">SIPOC</h1>
      <AccountRow />

      <NavLink
        to="/toegang"
        className={({ isActive }) =>
          `mt-3 self-start text-[12.5px] font-medium ${isActive ? "text-accent" : "text-grey-text hover:text-accent"}`
        }
      >
        Toegang beheren
      </NavLink>

      <p className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wide text-grey-text">
        Alle processen
      </p>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Zoek proces…"
        autoComplete="off"
        className="mb-3 rounded-md border border-grey-box-border px-2.5 py-1.5 text-sm outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
        className="mb-3 rounded-md border border-accent px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-bg disabled:opacity-60"
      >
        + Nieuw proces
      </button>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-[12.5px] text-grey-text">Laden…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[12.5px] text-grey-text">Geen processen gevonden.</p>
        ) : (
          filtered.map((p) => {
            const active = p.id === activeId;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                  active ? "bg-accent-bg text-accent" : "hover:bg-bg"
                }`}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/proces/${p.id}`)}
                  className="flex-1 truncate text-left"
                >
                  {p.name || <span className="italic text-grey-text">Procesnaam</span>}
                </button>
                {!!user && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, p.id)}
                    title="Proces verwijderen"
                    className="ml-1 shrink-0 text-grey-text hover:text-danger"
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function AccountRow() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-3 truncate text-[12.5px] text-grey-text">
      {user.email}
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="ml-2 shrink-0 text-accent hover:underline"
      >
        Uitloggen
      </button>
    </div>
  );
}

function filterAndSortProcesses(processes: ProcessSummary[], search: string): ProcessSummary[] {
  const q = search.trim().toLowerCase();
  const filtered = processes.filter((p) => (p.name || "procesnaam").toLowerCase().includes(q));
  filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "nl", { sensitivity: "base" }));
  return filtered;
}
