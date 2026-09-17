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

/** Eén afdeling + haar subboom, recursief. De "+" zit bewust NIET in de
 * <ul>/<li> die de boomlijntjes tekent (org-tree.css): hij is geen
 * afdeling, en meetellen als "sibling" gaf een kromme, asymmetrische
 * lijn zodra er precies één echt kind bij stond (nooit meer
 * :only-child, dus altijd de dubbele-tak-tekening i.p.v. een rechte
 * lijn). In plaats daarvan staat de "+" los, naast (of — met nul
 * kinderen — in z'n eentje onder) de <ul>, in dezelfde rij. */
export default function OrgTreeNode({ node, isRoot, canEdit, onRename, onAddChild, onDelete }: OrgTreeNodeProps) {
  const hasChildren = node.children.length > 0;

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
      {(hasChildren || canEdit) && (
        <div className="org-children">
          {hasChildren && (
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
            </ul>
          )}
          {canEdit && (
            <button
              type="button"
              className={`addbtn org-add-btn${hasChildren ? " org-add-btn--indented" : ""}`}
              title="Afdeling toevoegen"
              onClick={() => onAddChild(node.id, node.children.length)}
            >
              +
            </button>
          )}
        </div>
      )}
    </li>
  );
}
