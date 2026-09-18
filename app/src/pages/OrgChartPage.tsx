import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import {
  addChildInTree,
  addDepartment,
  deleteDepartment,
  fetchOrgTree,
  removeNodeInTree,
  renameDepartment,
  renameNodeInTree,
  type DepartmentKind,
  type DepartmentSide,
  type OrgNode,
} from "../lib/orgChart";
import OrgTreeNode from "../components/orgchart/OrgTreeNode";

const QUERY_KEY = ["org-tree"];

/** Organogram van afdelingen: één gedeelde boom (los van de SIPOC-
 * processen), met dezelfde +/x-bewerkinteractie als het SIPOC-bord. De
 * bovenste afdeling bestaat altijd al (aangemaakt via migratie) en kan
 * niet verwijderd worden — zie OrgTreeNode's `isRoot`.
 *
 * Twee soorten kinderen: gewone ("line", de kinderrij die naar rechts
 * uitbreidt) en stafafdelingen ("staff", die aan de verticale
 * verbinding naar die rij hangen — zie OrgTreeNode voor de lay-out).
 *
 * Elke mutatie werkt optimistisch (de boom in de React Query-cache
 * wordt meteen lokaal aangepast, vóór het netwerkverzoek terugkomt) —
 * zelfde directe respons als het SIPOC-bord, dat lokale state bijhoudt
 * i.p.v. na elke wijziging op een refetch te wachten. Zonder dit voelde
 * bv. hernoemen-vlak-na-toevoegen onbetrouwbaar: de nieuwe rechthoek
 * verscheen pas ná een round-trip, dus een klik erop kon op niets (nog)
 * bestaands landen. */
export default function OrgChartPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = !!user;

  const { data: root, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchOrgTree,
  });

  async function optimisticUpdate(updater: (previous: OrgNode) => OrgNode) {
    await queryClient.cancelQueries({ queryKey: QUERY_KEY });
    const previous = queryClient.getQueryData<OrgNode>(QUERY_KEY);
    if (previous) queryClient.setQueryData<OrgNode>(QUERY_KEY, updater(previous));
    return { previous };
  }

  function rollback(context: { previous?: OrgNode } | undefined) {
    if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
  }

  function settle() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  const addMutation = useMutation({
    mutationFn: ({
      id,
      parentId,
      position,
      kind,
      side,
    }: {
      id: string;
      parentId: string;
      position: number;
      kind: DepartmentKind;
      side: DepartmentSide | null;
    }) => addDepartment(id, parentId, position, kind, side),
    onMutate: ({ id, parentId, position, kind, side }) =>
      optimisticUpdate((prev) =>
        addChildInTree(prev, parentId, { id, label: null, kind, side, position, children: [] }),
      ),
    onError: (_err, _vars, context) => rollback(context),
    onSettled: settle,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) => renameDepartment(id, label),
    onMutate: ({ id, label }) => optimisticUpdate((prev) => renameNodeInTree(prev, id, label)),
    onError: (_err, _vars, context) => rollback(context),
    onSettled: settle,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onMutate: (id) => optimisticUpdate((prev) => removeNodeInTree(prev, id)),
    onError: (_err, _id, context) => rollback(context),
    onSettled: settle,
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-grey-text">Organogram laden…</div>;
  }
  if (isError || !root) {
    return (
      <div className="p-8 text-sm text-danger">
        Kon het organogram niet laden{error ? `: ${(error as Error).message}` : "."}
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-border bg-panel px-6 py-4">
        <h1 className="text-lg font-bold">Organogram</h1>
        <p className="text-[12.5px] text-grey-text">De afdelingsstructuur van de organisatie.</p>
      </header>
      <div className="org-tree-wrap">
        <ul className="org-tree">
          <OrgTreeNode
            node={root}
            isRoot
            canEdit={canEdit}
            onRename={(id, label) => renameMutation.mutate({ id, label })}
            onAddChild={(parentId, position) =>
              addMutation.mutate({ id: crypto.randomUUID(), parentId, position, kind: "line", side: null })
            }
            onAddStaff={(parentId, side, position) =>
              addMutation.mutate({ id: crypto.randomUUID(), parentId, position, kind: "staff", side })
            }
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </ul>
      </div>
    </div>
  );
}
