import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";

/**
 * Scaffolding smoke test: confirms Tailwind, React Router, TanStack Query
 * and the Supabase client are all wired up correctly, end to end. Gets
 * replaced by the real app shell in the next phase (auth + layout).
 */
function useSupabaseHealthCheck() {
  return useQuery({
    queryKey: ["health-check"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("processes")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export default function App() {
  const { data: processCount, isLoading, isError, error } = useSupabaseHealthCheck();

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-panel p-7 text-center">
        <h1 className="mb-1 text-lg font-bold">SIPOC</h1>
        <p className="mb-5 text-[12.5px] text-grey-text">
          Nieuwe front-end &mdash; scaffolding
        </p>

        <dl className="space-y-2 text-left text-sm">
          <Row label="Tailwind">
            <Ok />
          </Row>
          <Row label="React Router">
            <Ok />
          </Row>
          <Row label="TanStack Query">
            <Ok />
          </Row>
          <Row label="Supabase-verbinding">
            {isLoading ? (
              <span className="text-grey-text">bezig&hellip;</span>
            ) : isError ? (
              <span className="text-danger">
                mislukt: {(error as Error).message}
              </span>
            ) : (
              <span className="text-accent">
                verbonden &mdash; {processCount} zichtbare processen
              </span>
            )}
          </Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-grey-text">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Ok() {
  return <span className="text-accent">&#10003; werkt</span>;
}
