import { useState } from "react";
import ModalShell from "./ModalShell";
import { useMasterTable } from "../../hooks/useMasterTable";
import type { MasterTable } from "../../lib/masterTables";

interface MasterListModalProps {
  table: MasterTable;
  title: string;
  placeholder: string;
  onClose: () => void;
  /** Fires after every add (with the new item's id, so the caller can
   * auto-select it) or delete (with null) — mirrors index.html's
   * openMasterListModal(). */
  onChange?: (newId: string | null) => void;
}

/** Generic "manage this stamtabel" dialog, shared by all four master
 * lists (functies, externe partijen, communicatiesoorten, proceseigenaren). */
export default function MasterListModal({ table, title, placeholder, onClose, onChange }: MasterListModalProps) {
  const { items, isLoading, create, remove } = useMasterTable(table);
  const [draft, setDraft] = useState("");

  async function handleAdd() {
    if (!draft.trim()) return;
    const newId = await create(draft);
    setDraft("");
    onChange?.(newId);
  }

  async function handleDelete(id: string) {
    await remove(id);
    onChange?.(null);
  }

  return (
    <ModalShell onClose={onClose} title={title} nested sizeSm>
      <div className="function-list">
        {isLoading ? (
          <p className="function-empty">Laden…</p>
        ) : items.length === 0 ? (
          <p className="function-empty">Nog geen items aangemaakt.</p>
        ) : (
          items.map((item) => (
            <div className="function-row" key={item.id}>
              <span>{item.name}</span>
              <button type="button" title="Verwijderen" onClick={() => handleDelete(item.id)}>
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      <div className="function-add-row">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button type="button" onClick={handleAdd}>
          + Toevoegen
        </button>
      </div>
    </ModalShell>
  );
}
