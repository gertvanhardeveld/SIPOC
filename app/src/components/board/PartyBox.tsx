import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchStepProcessId } from "../../lib/board";

interface PartyBoxProps {
  label: string | null;
  placeholder: string;
  className: string;
  editable: boolean;
  onOpen: () => void;
  /** Bij een herkomst/bestemming die "Intern → Procesactiviteit" is: de
   * verwezen stap-id, om een doorklik-pijltje naar dat proces te tonen. */
  activityStepId?: string | null;
}

/** Supplier/customer rectangle: unlike the other boxes it never edits
 * inline — a click always opens the intern/extern detail form, since what
 * it shows is derived from that choice, not free text. */
export default function PartyBox({ label, placeholder, className, editable, onOpen, activityStepId }: PartyBoxProps) {
  const navigate = useNavigate();
  const { data: linkedProcessId } = useQuery({
    queryKey: ["step-process-id", activityStepId],
    queryFn: () => fetchStepProcessId(activityStepId!),
    enabled: !!activityStepId,
    staleTime: Infinity,
  });

  return (
    <div
      className={`box${label ? "" : " placeholder"} ${className}`}
      onClick={editable ? onOpen : undefined}
      onDoubleClick={editable ? onOpen : undefined}
    >
      {label || placeholder}
      {linkedProcessId && (
        <button
          type="button"
          className="box-link-arrow"
          title="Open het gekoppelde proces"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/proces/${linkedProcessId}`);
          }}
        >
          ↗
        </button>
      )}
    </div>
  );
}
