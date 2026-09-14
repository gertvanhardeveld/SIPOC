import type { MasterItem, SipocStep } from "../../lib/board";
import StepBlock from "./StepBlock";

export const COLS = {
  supplier: "Herkomst",
  input: "Input",
  process: "Activiteit",
  output: "Output",
  customer: "Bestemming",
};

export interface BoardActions {
  renameStep: (stepIdx: number, value: string | null) => void;
  renameInput: (stepIdx: number, inputIdx: number, value: string | null) => void;
  renameOutput: (stepIdx: number, outputIdx: number, value: string | null) => void;
  addStepAfter: (stepIdx: number) => void;
  removeStep: (stepIdx: number) => void;
  addInput: (stepIdx: number) => void;
  removeInput: (stepIdx: number, inputIdx: number) => void;
  addSupplier: (stepIdx: number, inputIdx: number) => void;
  removeSupplier: (stepIdx: number, inputIdx: number) => void;
  addOutput: (stepIdx: number) => void;
  removeOutput: (stepIdx: number, outputIdx: number) => void;
  addCustomer: (stepIdx: number, outputIdx: number) => void;
  removeCustomer: (stepIdx: number, outputIdx: number) => void;
  openStepModal: (stepIdx: number) => void;
  openFieldModal: (kind: "input" | "output", stepIdx: number, idx: number) => void;
  openPartyModal: (kind: "supplier" | "customer", stepIdx: number, idx: number) => void;
}

interface BoardProps {
  steps: SipocStep[];
  canEdit: boolean;
  functionsList: MasterItem[];
  externalPartiesList: MasterItem[];
  actions: BoardActions;
}

export default function Board({ steps, canEdit, functionsList, externalPartiesList, actions }: BoardProps) {
  return (
    <div className="board-wrap">
      <div className={`board${canEdit ? "" : " readonly-board"}`}>
        <div className="grid-guides">
          <div className="guide" style={{ gridColumn: 2 }} />
          <div className="guide" style={{ gridColumn: 4 }} />
          <div className="guide" style={{ gridColumn: 6 }} />
          <div className="guide" style={{ gridColumn: 8 }} />
        </div>
        <div className="headers">
          <div className="col-label">{COLS.supplier}</div>
          <div />
          <div className="col-label">{COLS.input}</div>
          <div />
          <div className="col-label">{COLS.process}</div>
          <div />
          <div className="col-label">{COLS.output}</div>
          <div />
          <div className="col-label">{COLS.customer}</div>
        </div>
        {steps.map((step, idx) => (
          <StepBlock
            key={step.id}
            step={step}
            stepIdx={idx}
            isLast={idx === steps.length - 1}
            canEdit={canEdit}
            functionsList={functionsList}
            externalPartiesList={externalPartiesList}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
}
