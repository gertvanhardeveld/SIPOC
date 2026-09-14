import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMasterItem, deleteMasterItem, fetchMasterTable, type MasterTable } from "../lib/masterTables";

/** Shared "stamtabel" (functions / external parties / communication types /
 * process owners): one cached list plus create/delete mutations that
 * invalidate it. Every master-list modal in the app is a thin wrapper
 * around this hook. */
export function useMasterTable(table: MasterTable) {
  const queryClient = useQueryClient();
  const queryKey = ["master", table];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMasterTable(table),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createMasterItem(table, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMasterItem(table, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
