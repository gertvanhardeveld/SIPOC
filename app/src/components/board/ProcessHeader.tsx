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
        <span className={`sync-status ${syncStatus}`}>{STATUS_LABEL[syncStatus]}</span>
        {!canEdit && <span className="readonly-notice">Alleen-lezen</span>}
      </div>
    </div>
  );
}
