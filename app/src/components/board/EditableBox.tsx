import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface EditableBoxProps {
  value: string | null;
  placeholder: string;
  className: string;
  editable: boolean;
  onCommit: (value: string | null) => void;
  /** Opens this box's detail modal; always commits any in-progress edit first. */
  onOpenDetails?: () => void;
}

/**
 * A "box" rectangle on the board: click to rename inline, double-click to
 * open its detail form. Renders a plain div normally and swaps to a real
 * <input> while editing — same visual result as index.html's
 * contenteditable div, but without fighting React's reconciliation over a
 * DOM node it doesn't control.
 */
export default function EditableBox({
  value,
  placeholder,
  className,
  editable,
  onCommit,
  onOpenDetails,
}: EditableBoxProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      // focus + caret at the end, next tick so the input exists in the DOM
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }, [editing]);

  function startEditing() {
    // Seed the draft synchronously, in the same click that flips `editing`
    // — not in an effect. A real double-click's two clicks land close
    // enough together that an effect-deferred resync can still be pending
    // when the second click's dblclick handler reads `draft`, committing a
    // stale (possibly empty, pre-data-load) value instead of the current one.
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit(nextDraft: string) {
    const trimmed = nextDraft.replace(/\s+/g, " ").trim();
    setEditing(false);
    onCommit(trimmed.length ? trimmed : null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      commit(e.currentTarget.value);
    }
  }

  function handleDoubleClick() {
    if (editing) commit(draft);
    onOpenDetails?.();
  }

  if (!editable) {
    return (
      <div className={`box${value ? "" : " placeholder"} ${className}`}>
        {value || placeholder}
      </div>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`box ${className}`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      />
    );
  }

  return (
    <div
      className={`box${value ? "" : " placeholder"} ${className}`}
      onClick={startEditing}
      onDoubleClick={handleDoubleClick}
    >
      {value || placeholder}
    </div>
  );
}
