import EditableBox from "../board/EditableBox";
import { nextStaffSlot, type DepartmentSide, type OrgNode } from "../../lib/orgChart";

interface OrgTreeNodeProps {
  node: OrgNode;
  isRoot: boolean;
  canEdit: boolean;
  onRename: (id: string, label: string | null) => void;
  onAddChild: (parentId: string, position: number) => void;
  onAddStaff: (parentId: string, side: DepartmentSide, position: number) => void;
  onDelete: (id: string) => void;
}

/** Eén afdeling + haar subboom, recursief.
 *
 * De verticale verbinding naar de kinderrij is nu een eigen zone
 * (.org-connector, dubbel zo hoog als voorheen) tussen het blokje en
 * .org-children: daar hangen stafafdelingen aan, om en om links/rechts
 * van de lijn, met een "+" op het midden. Ze zijn zelf géén onderdeel
 * van de gewone kinderrij (.org-children > ul) — dat gaf eerder al
 * problemen toen de "+"-knop daar wél in zat (zie eerdere fix): alles
 * dat geen "echte" rij-afdeling is, blijft dus bewust buiten die
 * <ul>/<li>-structuur.
 *
 * De "+" om een gewone afdeling toe te voegen staat, zoals eerder al
 * gefixt, los náást (niet ín) de <ul> met kinderen. */
export default function OrgTreeNode({
  node,
  isRoot,
  canEdit,
  onRename,
  onAddChild,
  onAddStaff,
  onDelete,
}: OrgTreeNodeProps) {
  const lineChildren = node.children.filter((c) => c.kind === "line");
  const staffChildren = node.children.filter((c) => c.kind === "staff");
  const leftStaff = staffChildren.filter((c) => c.side === "left").sort((a, b) => b.position - a.position);
  const rightStaff = staffChildren.filter((c) => c.side === "right").sort((a, b) => a.position - b.position);
  const hasLineChildren = lineChildren.length > 0;
  const hasStaffChildren = staffChildren.length > 0;
  const showConnectorZone = hasLineChildren || hasStaffChildren || canEdit;
  // De verticale verbinding moet altijd precies onder dit blokje blijven
  // staan, ook als er (nog) maar aan één kant een stafafdeling hangt —
  // dus reserveren beide kanten evenveel ruimte, gebaseerd op de kant
  // met de meeste stafafdelingen, i.p.v. allebei hun eigen (mogelijk
  // ongelijke) inhoud te laten bepalen hoe breed ze zijn.
  const maxStaffPerSide = Math.max(leftStaff.length, rightStaff.length);
  const staffSideMinWidth = maxStaffPerSide > 0 ? maxStaffPerSide * 170 + (maxStaffPerSide - 1) * 14 : 0;
  const nextStaff = nextStaffSlot(node);

  return (
    <li>
      <div className="org-node">
        <EditableBox
          value={node.label}
          placeholder="Afdeling"
          className="box-process"
          editable={canEdit}
          onCommit={(value) => onRename(node.id, value)}
        />
        {canEdit && !isRoot && (
          <button
            type="button"
            className="minus"
            title="Afdeling verwijderen"
            onClick={() => onDelete(node.id)}
          >
            &times;
          </button>
        )}
      </div>

      {showConnectorZone && (
        <div className="org-connector">
          <div className="org-staff-side org-staff-left" style={{ minWidth: staffSideMinWidth }}>
            {leftStaff.map((staff) => (
              <StaffNode key={staff.id} node={staff} canEdit={canEdit} onRename={onRename} onDelete={onDelete} />
            ))}
          </div>
          <div className="org-connector-center">
            {/* Alleen tekenen als er al écht iets aan hangt (staf- of
                gewone kinderen) — een blote blad-afdeling hoeft geen
                lijn te tonen, alleen de +-knoppen om iets toe te
                voegen; die lijn ontstaat pas zodra dat gebeurt. */}
            {(hasLineChildren || hasStaffChildren) && <div className="org-connector-line" />}
            {canEdit && (
              <button
                type="button"
                className="addbtn org-staff-add-btn"
                title="Stafafdeling toevoegen"
                onClick={() => onAddStaff(node.id, nextStaff.side, nextStaff.position)}
              >
                +
              </button>
            )}
          </div>
          <div className="org-staff-side org-staff-right" style={{ minWidth: staffSideMinWidth }}>
            {rightStaff.map((staff) => (
              <StaffNode key={staff.id} node={staff} canEdit={canEdit} onRename={onRename} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {showConnectorZone && (
        <div className="org-children">
          {hasLineChildren && (
            <ul>
              {lineChildren.map((child) => (
                <OrgTreeNode
                  key={child.id}
                  node={child}
                  isRoot={false}
                  canEdit={canEdit}
                  onRename={onRename}
                  onAddChild={onAddChild}
                  onAddStaff={onAddStaff}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
          {canEdit && (
            <button
              type="button"
              className="addbtn org-add-btn"
              title="Afdeling toevoegen"
              onClick={() => onAddChild(node.id, lineChildren.length)}
            >
              +
            </button>
          )}
        </div>
      )}
    </li>
  );
}

interface StaffNodeProps {
  node: OrgNode;
  canEdit: boolean;
  onRename: (id: string, label: string | null) => void;
  onDelete: (id: string) => void;
}

/** Een stafafdeling: lichtgrijs gevuld (de kale .box-stijl, i.t.t. de
 * witte .box-process van gewone afdelingen), geen eigen subboom. */
function StaffNode({ node, canEdit, onRename, onDelete }: StaffNodeProps) {
  return (
    <div className="org-node org-staff-node">
      <EditableBox
        value={node.label}
        placeholder="Stafafdeling"
        className=""
        editable={canEdit}
        onCommit={(value) => onRename(node.id, value)}
      />
      {canEdit && (
        <button type="button" className="minus" title="Stafafdeling verwijderen" onClick={() => onDelete(node.id)}>
          &times;
        </button>
      )}
    </div>
  );
}
