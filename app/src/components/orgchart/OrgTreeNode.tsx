import EditableBox from "../board/EditableBox";
import type { OrgNode } from "../../lib/orgChart";

interface OrgTreeNodeProps {
  node: OrgNode;
  isRoot: boolean;
  canEdit: boolean;
  onRename: (id: string, label: string | null) => void;
  onAddChild: (parentId: string, position: number) => void;
  onDelete: (id: string) => void;
}

/** Eén afdeling + haar subboom, recursief. De "+" om een afdeling toe te
 * voegen staat als laatste <li> ná de bestaande kinderen — zo blijft hij
 * op dezelfde plek staan (rechts van het rijtje) en groeit een rij
 * afdelingen steeds naar rechts uit, precies zoals gevraagd. Het is
 * bewust een <li> net als de echte kinderen (niet een los element erbuiten)
 * zodat hij meedoet met de CSS-boomlijntjes (org-tree.css): met 0
 * bestaande kinderen is de "+" dan het enige, rechte lijntje naar
 * beneden; met meerdere kinderen sluit hij netjes aan op de
 * horizontale verbindingslijn. */
export default function OrgTreeNode({ node, isRoot, canEdit, onRename, onAddChild, onDelete }: OrgTreeNodeProps) {
  const showChildrenRow = node.children.length > 0 || canEdit;

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
      {showChildrenRow && (
        <ul>
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              isRoot={false}
              canEdit={canEdit}
              onRename={onRename}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
          {canEdit && (
            <li>
              <button
                type="button"
                className="addbtn org-add-btn"
                title="Afdeling toevoegen"
                onClick={() => onAddChild(node.id, node.children.length)}
              >
                +
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
