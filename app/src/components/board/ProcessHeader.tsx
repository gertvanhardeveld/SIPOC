import EditableBox from "./EditableBox";
import type { SyncStatus } from "../../hooks/useSyncStatus";

interface ProcessHeaderProps {
  name: string | null;
  canEdit: boolean;
  syncStatus: SyncStatus;
  onRename: (value: string | null) => void;
  onOpenDetails: () => void;
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: "Opgeslagen",
  saving: "Bezig met opslaan…",
  error: "Opslaan mislukt — controleer je verbinding",
};

/** Vervangt "Opgeslagen" rechtsboven: dat hoeft niet continu bevestigd te
 * worden, maar saving/error blijven wel zichtbaar (belangrijke feedback). */
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function ProcessHeader({ name, canEdit, syncStatus, onRename, onOpenDetails }: ProcessHeaderProps) {
  return (
    <div className={`process-header${canEdit ? "" : " readonly-header"}`}>
      <div className="process-name-row">
        <EditableBox
          value={name}
          placeholder="Procesnaam"
          className="box-process-name"
          editable={canEdit}
          onCommit={onRename}
          onOpenDetails={onOpenDetails}
        />
        {syncStatus !== "idle" && <span className={`sync-status ${syncStatus}`}>{STATUS_LABEL[syncStatus]}</span>}
        <button
          type="button"
          className="download-icon-btn"
          title="Download een afdruk van deze SIPOC"
          onClick={() => window.print()}
        >
          <DownloadIcon />
        </button>
        {!canEdit && <span className="readonly-notice">Alleen-lezen</span>}
      </div>
    </div>
  );
}
