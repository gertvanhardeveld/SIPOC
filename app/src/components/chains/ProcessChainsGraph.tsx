import { useMemo } from "react";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ChainNode from "./ChainNode";
import { layoutChainNodes, type ChainEdge, type ChainNode as ChainNodeModel } from "../../lib/processChains";

const nodeTypes = { chainNode: ChainNode };

interface ProcessChainsGraphProps {
  nodes: ChainNodeModel[];
  edges: ChainEdge[];
}

/** Pan/zoom-baar netwerk van gekoppelde activiteiten (react-flow) — de
 * lay-out zelf komt uit een simpel, afhankelijkheidsvrij algoritme
 * (layoutChainNodes); react-flow verzorgt verder alleen het interactieve
 * canvas (slepen, in/uitzoomen, minimap-achtige controls). */
export default function ProcessChainsGraph({ nodes, edges }: ProcessChainsGraphProps) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const positions = layoutChainNodes(nodes, edges);
    const posById = new Map(positions.map((p) => [p.id, p]));

    const flowNodes: Node[] = nodes.map((n) => ({
      id: n.id,
      type: "chainNode",
      position: posById.get(n.id) ?? { x: 0, y: 0 },
      data: {
        processName: n.processName || "Naamloos proces",
        stepLabel: n.stepLabel || "Naamloze activiteit",
      },
    }));

    const flowEdges: Edge[] = edges.map((e) => ({
      id: e.id,
      source: e.fromStepId,
      target: e.toStepId,
      label: e.label || undefined,
      type: "straight",
      markerStart: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--color-accent)" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--color-accent)" },
      style: { stroke: "var(--color-accent)", strokeWidth: 1.5 },
      labelStyle: { fill: "var(--color-dark-text)", fontSize: 12, fontWeight: 600 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
    }));

    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      nodesDraggable
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
