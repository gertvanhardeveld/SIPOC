import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthContext";
import { addDepartment, deleteDepartment, fetchOrgTree, renameDepartment } from "../lib/orgChart";
import OrgTreeNode from "../components/orgchart/OrgTreeNode";

/** Organogram van afdelingen: één gedeelde boom (los van de SIPOC-
 * processen), met dezelfde +/x-bewerkinteractie als het SIPOC-bord. De
 * bovenste afdeling bestaat altijd al (aangemaakt via migratie) en kan
 * niet verwijderd worden — zie OrgTreeNode's `isRoot`. */
export default function OrgChartPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = !!user;

  const { data: root, isLoading, isError, error } = useQuery({
    queryKey: ["org-tree"],
    queryFn: fetchOrgTree,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["org-tree"] });
  }

  const addMutation = useMutation({
    mutationFn: ({ parentId, position }: { parentId: string; position: number }) =>
      addDepartment(parentId, position),
    onSuccess: invalidate,
  });
  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) => renameDepartment(id, label),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: invalidate,
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
            onAddChild={(parentId, position) => addMutation.mutate({ parentId, position })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </ul>
      </div>
    </div>
  );
}
