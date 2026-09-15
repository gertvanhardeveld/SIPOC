import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessChainGraph } from "../lib/processChains";
import ProcessChainsGraph from "../components/chains/ProcessChainsGraph";

/** Overzicht van hoe processen via gekoppelde activiteiten aan elkaar
 * hangen (zie PartyModal → Intern → Procesactiviteit). Toont alleen
 * processen die minstens één zo'n koppeling hebben; een los procesfilter
 * laat je bij veel koppelingen inzoomen op wat je wilt zien. */
export default function ProcessChainsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["process-chains"],
    queryFn: fetchProcessChainGraph,
  });
  const [hiddenProcessIds, setHiddenProcessIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const involvedProcesses = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.nodes.forEach((n) => {
      if (!map.has(n.processId)) map.set(n.processId, n.processName || "Naamloos proces");
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }));
  }, [data]);

  const visibleNodes = useMemo(
    () => (data ? data.nodes.filter((n) => !hiddenProcessIds.has(n.processId)) : []),
    [data, hiddenProcessIds],
  );
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => (data ? data.edges.filter((e) => visibleNodeIds.has(e.fromStepId) && visibleNodeIds.has(e.toStepId)) : []),
    [data, visibleNodeIds],
  );

  function toggleProcess(id: string) {
    setHiddenProcessIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-grey-text">Procesketens laden…</div>;
  }
  if (isError || !data) {
    return (
      <div className="p-8 text-sm text-danger">
        Kon de procesketens niet laden{error ? `: ${(error as Error).message}` : "."}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-border bg-panel px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">Procesketens</h1>
          <p className="text-[12.5px] text-grey-text">
            Hoe processen via gekoppelde activiteiten aan elkaar hangen — alleen processen met minstens één koppeling
            staan hier.
          </p>
        </div>
        {involvedProcesses.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="rounded-md border border-grey-box-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
            >
              Processen ({involvedProcesses.length - hiddenProcessIds.size}/{involvedProcesses.length})
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-10 mt-2 max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-panel p-3 shadow-lg">
                {involvedProcesses.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={!hiddenProcessIds.has(p.id)} onChange={() => toggleProcess(p.id)} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {data.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-grey-text">
            Nog geen gekoppelde processen — kies bij een herkomst/bestemming "Intern" →
            "Procesactiviteit" om er hier een te zien.
          </div>
        ) : (
          <ProcessChainsGraph nodes={visibleNodes} edges={visibleEdges} />
        )}
      </div>
    </div>
  );
}
