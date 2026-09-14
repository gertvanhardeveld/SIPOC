import { useEffect, type ReactNode } from "react";

interface ModalShellProps {
  onClose: () => void;
  /** Detail modals ("Details — <em>Naam</em>"): pass titlePrefix + titleEm.
   * Master-list modals ("Functies beheren"): pass title instead. */
  titlePrefix?: string;
  titleEm?: string;
  title?: string;
  nested?: boolean;
  sizeSm?: boolean;
  children: ReactNode;
}

/** Overlay + panel shell shared by every detail form and master-list
 * dialog: closes on Escape or a backdrop click, matching index.html's
 * modal behavior exactly. */
export default function ModalShell({ onClose, titlePrefix, titleEm, title, nested, sizeSm, children }: ModalShellProps) {
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [onClose]);

  return (
    <div
      className={`modal-overlay${nested ? " modal-nested" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel${sizeSm ? " modal-panel-sm" : ""}`}>
        <div className="modal-header">
          <h2>
            {titlePrefix}
            {titleEm && <em>{titleEm}</em>}
            {title}
          </h2>
          <button type="button" className="modal-close" title="Sluiten" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
