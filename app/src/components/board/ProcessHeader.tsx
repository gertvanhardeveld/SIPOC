import EditableBox from "./EditableBox";
import type { SyncStatus } from "../../hooks/useSyncStatus";

interface ProcessHeaderProps {
  name: string | null;
  canEdit: boolean;
  syncStatus: SyncStatus;
  onRename: (value: string | null) => void;
  onOpenDetails: () => void;
  onDownloadPng: () => void;
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

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export default function ProcessHeader({
  name,
  canEdit,
  syncStatus,
  onRename,
  onOpenDetails,
  onDownloadPng,
}: ProcessHeaderProps) {
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
          className="png-icon-btn"
          title="Download een PNG-afbeelding van deze SIPOC"
          onClick={onDownloadPng}
        >
          <ImageIcon />
        </button>
        <button
          type="button"
          className="download-icon-btn"
          title="Download een afdruk (PDF) van deze SIPOC"
          onClick={() => window.print()}
        >
          <DownloadIcon />
        </button>
        {!canEdit && <span className="readonly-notice">Alleen-lezen</span>}
      </div>
    </div>
  );
}
