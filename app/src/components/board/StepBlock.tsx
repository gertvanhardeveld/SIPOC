import { Fragment } from "react";
import EditableBox from "./EditableBox";
import PartyBox from "./PartyBox";
import { partyResolvedLabel, type MasterItem, type SipocStep } from "../../lib/board";
import type { BoardActions } from "./Board";
import { COLS } from "./Board";

interface StepBlockProps {
  step: SipocStep;
  stepIdx: number;
  isLast: boolean;
  canEdit: boolean;
  functionsList: MasterItem[];
  externalPartiesList: MasterItem[];
  actions: BoardActions;
}

function ArrowRight() {
  return (
    <div className="arrow-cell">
      <div className="arrow-h" />
    </div>
  );
}

function EmptyArrowCell() {
  return <div className="arrow-cell" />;
}

/** One process step and its whole row of inputs/outputs/supplier/customer
 * boxes — a mechanical port of index.html's renderStepBlock(), row by row,
 * onto the same 9-column CSS grid (see board.css's --grid-cols). */
export default function StepBlock({
  step,
  stepIdx,
  isLast,
  canEdit,
  functionsList,
  externalPartiesList,
  actions,
}: StepBlockProps) {
  const rowCount = Math.max(step.inputs.length, step.outputs.length, 1);
  const rows = Array.from({ length: rowCount }, (_, r) => r);

  return (
    <div className="step-block">
      <div className="step-grid">
        {rows.map((r) => {
          const input = step.inputs[r];
          const output = step.outputs[r];
          const gridRow = r + 1;
          // AO-online-stijl: intern/extern wordt bij de herkomst/bestemming
          // zelf gekozen (PartyRef.kind) — dat bepaalt de kleur van zowel
          // dat blokje als het bijbehorende input/output-blokje, geen losse
          // vraag bij input/output zelf.
          const supplierInternal = input?.supplier?.kind === "intern";
          const customerInternal = output?.customer?.kind === "intern";

          return (
            <Fragment key={r}>
              {/* Supplier */}
              <div className="cell" style={{ gridRow, gridColumn: 1 }}>
                {input?.supplier && (
                  <div className="process-wrap">
                    <PartyBox
                      label={partyResolvedLabel(input.supplier, functionsList, externalPartiesList)}
                      placeholder={COLS.supplier}
                      className={`box-supplier${supplierInternal ? " box-internal" : ""}`}
                      editable={canEdit}
                      onOpen={() => actions.openPartyModal("supplier", stepIdx, r)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        className="minus"
                        title="Verwijderen"
                        onClick={() => actions.removeSupplier(stepIdx, r)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ gridRow, gridColumn: 2 }}>{input?.supplier ? <ArrowRight /> : <EmptyArrowCell />}</div>

              {/* Input */}
              <div className="cell" style={{ gridRow, gridColumn: 3 }}>
                {input && (
                  <div className="process-wrap">
                    <EditableBox
                      value={input.label}
                      placeholder={COLS.input}
                      className={`box-input${supplierInternal ? " box-internal" : ""}`}
                      editable={canEdit}
                      onCommit={(v) => actions.renameInput(stepIdx, r, v)}
                      onOpenDetails={() => actions.openFieldModal("input", stepIdx, r)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        className="minus"
                        title="Verwijderen"
                        onClick={() => actions.removeInput(stepIdx, r)}
                      >
                        &times;
                      </button>
                    )}
                    {canEdit && !input.supplier && (
                      <button
                        type="button"
                        className="addbtn edge-plus edge-plus-left"
                        title="Supplier toevoegen"
                        onClick={() => actions.addSupplier(stepIdx, r)}
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ gridRow, gridColumn: 4 }}>{input ? <ArrowRight /> : <EmptyArrowCell />}</div>

              {/* Process (only on the first row, spans the whole block) */}
              {r === 0 && (
                <div className="cell" style={{ gridRow: `1 / span ${rowCount}`, gridColumn: 5 }}>
                  <div className="process-wrap">
                    <EditableBox
                      value={step.label}
                      placeholder={COLS.process}
                      className={`box-process${step.isDecision ? " box-decision" : ""}`}
                      editable={canEdit}
                      onCommit={(v) => actions.renameStep(stepIdx, v)}
                      onOpenDetails={() => actions.openStepModal(stepIdx)}
                    />
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="minus minus-step"
                          title="Verwijderen"
                          onClick={() => actions.removeStep(stepIdx)}
                        >
                          &times;
                        </button>
                        <button
                          type="button"
                          className="addbtn plus-step"
                          title="Processtap invoegen na deze stap"
                          onClick={() => actions.addStepAfter(stepIdx)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="addbtn edge-plus edge-plus-left"
                          title="Input toevoegen"
                          onClick={() => actions.addInput(stepIdx)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="addbtn edge-plus edge-plus-right"
                          title="Output toevoegen"
                          onClick={() => actions.addOutput(stepIdx)}
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Output */}
              <div style={{ gridRow, gridColumn: 6 }}>{output ? <ArrowRight /> : <EmptyArrowCell />}</div>
              <div className="cell" style={{ gridRow, gridColumn: 7 }}>
                {output && (
                  <div className="process-wrap">
                    <EditableBox
                      value={output.label}
                      placeholder={COLS.output}
                      className={`box-output${customerInternal ? " box-internal" : ""}`}
                      editable={canEdit}
                      onCommit={(v) => actions.renameOutput(stepIdx, r, v)}
                      onOpenDetails={() => actions.openFieldModal("output", stepIdx, r)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        className="minus"
                        title="Verwijderen"
                        onClick={() => actions.removeOutput(stepIdx, r)}
                      >
                        &times;
                      </button>
                    )}
                    {canEdit && !output.customer && (
                      <button
                        type="button"
                        className="addbtn edge-plus edge-plus-right"
                        title="Customer toevoegen"
                        onClick={() => actions.addCustomer(stepIdx, r)}
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Customer */}
              <div style={{ gridRow, gridColumn: 8 }}>
                {output?.customer ? <ArrowRight /> : <EmptyArrowCell />}
              </div>
              <div className="cell" style={{ gridRow, gridColumn: 9 }}>
                {output?.customer && (
                  <div className="process-wrap">
                    <PartyBox
                      label={partyResolvedLabel(output.customer, functionsList, externalPartiesList)}
                      placeholder={COLS.customer}
                      className={`box-customer${customerInternal ? " box-internal" : ""}`}
                      editable={canEdit}
                      onOpen={() => actions.openPartyModal("customer", stepIdx, r)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        className="minus"
                        title="Verwijderen"
                        onClick={() => actions.removeCustomer(stepIdx, r)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      {!isLast && (
        <div className="step-grid" style={{ rowGap: 0 }}>
          <div className="cell" style={{ gridRow: 1, gridColumn: 5 }}>
            <div className="arrow-v-wrap">
              <div className="arrow-v" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
