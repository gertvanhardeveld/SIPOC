interface PartyBoxProps {
  label: string | null;
  placeholder: string;
  className: string;
  editable: boolean;
  onOpen: () => void;
}

/** Supplier/customer rectangle: unlike the other boxes it never edits
 * inline — a click always opens the intern/extern detail form, since what
 * it shows is derived from that choice, not free text. */
export default function PartyBox({ label, placeholder, className, editable, onOpen }: PartyBoxProps) {
  return (
    <div
      className={`box${label ? "" : " placeholder"} ${className}`}
      onClick={editable ? onOpen : undefined}
      onDoubleClick={editable ? onOpen : undefined}
    >
      {label || placeholder}
    </div>
  );
}
