import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useNavigate } from "react-router-dom";

export interface ChainNodeData {
  processId: string;
  processName: string;
  stepLabel: string;
  [key: string]: unknown;
}

/** Eén activiteit die aan een andere activiteit (in een ander proces)
 * gekoppeld is: procesnaam boven, de activiteit zelf cursief eronder —
 * zoals gevraagd. Klikken op de rechthoek opent de SIPOC van dat proces;
 * "nodrag nopan" voorkomt dat react-flow die klik eerst als sleep- of
 * pan-gebaar opvat. De handles zijn puur voor het tekenen van de
 * verbindingslijn, niet om zelf nieuwe te trekken. */
export default function ChainNode({ data }: NodeProps) {
  const d = data as unknown as ChainNodeData;
  const navigate = useNavigate();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/proces/${d.processId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/proces/${d.processId}`);
      }}
      title="Open de SIPOC van dit proces"
      className="nodrag nopan cursor-pointer rounded-2xl border-2 border-dark-text bg-white px-5 py-3.5 text-center shadow-sm transition-colors hover:border-accent"
      style={{ width: 220 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="font-semibold text-dark-text">{d.processName}</div>
      <div className="mt-0.5 text-sm italic text-grey-text">{d.stepLabel}</div>
    </div>
  );
}
