"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeProps,
  EdgeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EntityGroupData, resolveGroup } from "@/lib/types";
import { X } from "lucide-react";

interface GraphNodeData {
  label: string;
  type: string;
  entityId: string;
  dimmed?: boolean;
  selected?: boolean;
  neighborCount?: number;
  [key: string]: unknown;
}

// ─── Custom Node ───────────────────────────────────────────────
function CustomNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const groups: EntityGroupData[] = (data as GraphNodeData & { groups?: EntityGroupData[] }).groups || [];
  const g = resolveGroup(data.type, groups);
  const color = g.color;
  const label = g.name;
  const isDimmed = data.dimmed && !data.selected;
  const isSelected = data.selected;
  const handleStyle = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, background: 'transparent', border: 'none' };

  return (
    <div
      className="bg-surface border rounded-lg px-3 py-2 cursor-pointer transition-all duration-200"
      style={{
        borderColor: isSelected ? color : `${color}40`,
        minWidth: 120,
        opacity: isDimmed ? 0.2 : 1,
        boxShadow: isSelected
          ? `0 0 0 2px ${color}30, 0 4px 12px ${color}25`
          : "0 1px 3px rgba(0,0,0,0.06)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
      }}
    >
      <Handle type="source" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="target" position={Position.Top} id="t-top" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="t-left" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="t-right" style={handleStyle} />
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[14px] tracking-[0.2em] uppercase" style={{ color }}>
          {label}
        </span>
        {data.neighborCount !== undefined && data.neighborCount > 0 && (
          <span className="ml-auto text-[14px] text-ink-3 bg-ink-3/8 px-1 rounded">{data.neighborCount}</span>
        )}
      </div>
      <div className="font-serif text-[19px] font-light text-ink leading-tight">
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

// ─── Dual-color edge ─────────────────────────────────────────────
function DualColorEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style, markerEnd }: EdgeProps) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const sourceColor = (data as { sourceColor?: string })?.sourceColor || "#A8A29E";
  const targetColor = (data as { targetColor?: string })?.targetColor || "#A8A29E";
  const sameColor = sourceColor === targetColor;
  const strokeWidth = style?.strokeWidth ?? 1.5;
  const opacity = style?.opacity ?? 1;
  const strokeDasharray = (style as { strokeDasharray?: string })?.strokeDasharray;

  if (sameColor) {
    return <path id={id} d={edgePath} stroke={sourceColor} strokeWidth={strokeWidth} opacity={opacity} strokeDasharray={strokeDasharray} fill="none" markerEnd={markerEnd} />;
  }

  const gradId = `grad-${id}`;
  return (
    <>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="50%" stopColor={sourceColor} />
          <stop offset="50%" stopColor={targetColor} />
        </linearGradient>
      </defs>
      <path id={id} d={edgePath} stroke={`url(#${gradId})`} strokeWidth={strokeWidth} opacity={opacity} strokeDasharray={strokeDasharray} fill="none" markerEnd={markerEnd} />
    </>
  );
}

const edgeTypes = { dualColor: DualColorEdge };

// ─── Force-directed layout ──────────────────────────────────────
interface SimNode { id: string; x: number; y: number; vx: number; vy: number; type: string }

function forceDirectedLayout(
  entities: { id: string; type: string }[],
  relations: { sourceId: string; targetId: string }[],
  iterations = 300,
): Record<string, { x: number; y: number }> {
  // Node dimensions for collision
  const NODE_W = 160;
  const NODE_H = 70;
  const MIN_GAP = 40; // generous gap between node edges

  // Scale canvas to entity count to avoid crowding
  const n = entities.length;
  const width = Math.max(900, Math.sqrt(n) * 250);
  const height = Math.max(700, Math.sqrt(n) * 200);

  const nodes: SimNode[] = entities.map(e => ({
    id: e.id, type: e.type,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    vx: 0, vy: 0,
  }));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edges = relations.map(r => ({
    source: nodeMap.get(r.sourceId),
    target: nodeMap.get(r.targetId),
  })).filter(e => e.source && e.target) as { source: SimNode; target: SimNode }[];

  // Type-based center bias — spread types in a grid pattern
  const uniqueTypes = Array.from(new Set(entities.map(e => e.type)));
  const typeCenters: Record<string, { x: number; y: number }> = {};
  const cols = Math.ceil(Math.sqrt(uniqueTypes.length));
  uniqueTypes.forEach((t, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    typeCenters[t] = {
      x: (col + 1) * width / (cols + 1),
      y: (row + 1) * height / (Math.ceil(uniqueTypes.length / cols) + 1),
    };
  });

  const repulsion = 20000;
  const attraction = 0.004;
  const centerGravity = 0.008;
  const typeGravity = 0.003;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations; // cooling

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = NODE_W + MIN_GAP;
        // Stronger repulsion when close
        const force = dist < minDist
          ? repulsion * 2 / (dist * dist) * temp
          : repulsion / (dist * dist) * temp;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }

    // Attraction along edges
    for (const { source, target } of edges) {
      const dx = target.x - source.x, dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = NODE_W * 2 + MIN_GAP;
      const force = (dist - idealDist) * attraction * temp;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      source.vx += fx; source.vy += fy;
      target.vx -= fx; target.vy -= fy;
    }

    // Center gravity + type clustering
    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * centerGravity;
      n.vy += (height / 2 - n.y) * centerGravity;
      const tc = typeCenters[n.type];
      if (tc) {
        n.vx += (tc.x - n.x) * typeGravity * temp;
        n.vy += (tc.y - n.y) * typeGravity * temp;
      }
    }

    // Apply velocity
    for (const n of nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(NODE_W / 2, Math.min(width - NODE_W / 2, n.x));
      n.y = Math.max(NODE_H / 2, Math.min(height - NODE_H / 2, n.y));
    }

    // Collision resolution — push overlapping nodes apart
    // Run multiple passes for thorough resolution
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const overlapX = (NODE_W + MIN_GAP) - Math.abs(a.x - b.x);
          const overlapY = (NODE_H + MIN_GAP) - Math.abs(a.y - b.y);
          if (overlapX > 0 && overlapY > 0) {
            const strength = 0.5 * temp + 0.5;
            if (overlapX < overlapY) {
              const sign = a.x < b.x ? -1 : 1;
              a.x += sign * overlapX * strength / 2;
              b.x -= sign * overlapX * strength / 2;
            } else {
              const sign = a.y < b.y ? -1 : 1;
              a.y += sign * overlapY * strength / 2;
              b.y -= sign * overlapY * strength / 2;
            }
          }
        }
      }
    }
  }

  const result: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) result[n.id] = { x: n.x, y: n.y };
  return result;
}

// ─── Count neighbors per entity ─────────────────────────────────
function countNeighbors(entities: { id: string }[], relations: { sourceId: string; targetId: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entities) counts[e.id] = 0;
  for (const r of relations) {
    counts[r.sourceId] = (counts[r.sourceId] || 0) + 1;
    counts[r.targetId] = (counts[r.targetId] || 0) + 1;
  }
  return counts;
}

// ─── Main component ─────────────────────────────────────────────
type TypeFilter = string | "all";

interface GraphViewProps {
  entities: { id: string; name: string; type: string; description?: string | null; parentId?: string | null; children?: { id: string }[] }[];
  relations: { id: string; sourceId: string; targetId: string; label: string }[];
  groups?: EntityGroupData[];
  onNodeClick?: (entityId: string) => void;
}

function GraphViewInner({ entities, relations, groups = [], onNodeClick }: GraphViewProps) {
  const { t } = useLocale();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  // hoveredNodeId = Obsidian-style hover highlight (instant)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // selectedNodeId = click-pinned selection (for info card)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  // The "active" node is either hovered or selected (hover takes priority)
  const activeNodeId = hoveredNodeId || selectedNodeId;

  // Filter entities by type
  const filteredEntities = useMemo(() => {
    if (typeFilter === "all") return entities;
    return entities.filter(e => e.type === typeFilter);
  }, [entities, typeFilter]);

  const filteredEntityIds = useMemo(() => new Set(filteredEntities.map(e => e.id)), [filteredEntities]);

  const filteredRelations = useMemo(() => {
    return relations.filter(r => filteredEntityIds.has(r.sourceId) && filteredEntityIds.has(r.targetId));
  }, [relations, filteredEntityIds]);

  // Direct neighbors of active node
  const activeNeighborIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const ids = new Set<string>([activeNodeId]);
    for (const r of filteredRelations) {
      if (r.sourceId === activeNodeId) ids.add(r.targetId);
      if (r.targetId === activeNodeId) ids.add(r.sourceId);
    }
    return ids;
  }, [activeNodeId, filteredRelations]);

  // Active edges (connected to active node)
  const activeEdgeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const r of filteredRelations) {
      if (r.sourceId === activeNodeId || r.targetId === activeNodeId) ids.add(r.id);
    }
    return ids;
  }, [activeNodeId, filteredRelations]);

  const neighborCounts = useMemo(() => countNeighbors(entities, relations), [entities, relations]);

  // Persisted positions — user drags are preserved across re-renders
  const [userPositions, setUserPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Compute layout — always force-directed, no mode switching
  const positions = useMemo(() => {
    return forceDirectedLayout(filteredEntities, filteredRelations);
  }, [filteredEntities, filteredRelations]);

  const initialNodes: Node<GraphNodeData>[] = useMemo(() => {
    const hasActive = !!activeNodeId;
    return filteredEntities.map(e => ({
      id: e.id,
      type: "custom",
      position: userPositions[e.id] || positions[e.id] || { x: 200, y: 200 },
      data: {
        label: e.name,
        type: e.type,
        entityId: e.id,
        groups,
        neighborCount: neighborCounts[e.id] || 0,
        selected: e.id === selectedNodeId,
        dimmed: hasActive ? !activeNeighborIds.has(e.id) : false,
      },
    }));
  }, [filteredEntities, positions, userPositions, activeNodeId, activeNeighborIds, selectedNodeId, neighborCounts, groups]);

  // Pick the best handle based on relative node positions
  const getHandle = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, prefix: string) => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? `${prefix}right` : `${prefix}left`;
    } else {
      return dy > 0 ? `${prefix}bottom` : `${prefix}top`;
    }
  };

  // Obsidian-style edges: dual-color, labels hidden by default, shown on hover
  const initialEdges: Edge[] = useMemo(() => {
    const hasActive = !!activeNodeId;
    const relEdges = filteredRelations.map(r => {
      const isActive = activeEdgeIds.has(r.id);
      const isDimmed = hasActive && !isActive;
      const sourceType = filteredEntities.find(e => e.id === r.sourceId)?.type;
      const targetType = filteredEntities.find(e => e.id === r.targetId)?.type;
      const sourceColor = sourceType ? resolveGroup(sourceType, groups).color : "#78716C";
      const targetColor = targetType ? resolveGroup(targetType, groups).color : "#78716C";
      const srcPos = positions[r.sourceId];
      const tgtPos = positions[r.targetId];

      return {
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        sourceHandle: srcPos && tgtPos ? getHandle(srcPos, tgtPos, "") : undefined,
        targetHandle: srcPos && tgtPos ? getHandle(tgtPos, srcPos, "t-") : undefined,
        label: isActive ? r.label : undefined,
        animated: isActive,
        type: "dualColor",
        data: {
          sourceColor: isActive ? sourceColor : "#A8A29E",
          targetColor: isActive ? targetColor : "#A8A29E",
        },
        style: {
          strokeWidth: isActive ? 2.5 : 1,
          opacity: isDimmed ? 0.08 : isActive ? 1 : 0.35,
          transition: "stroke-width 0.15s, opacity 0.15s",
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "Geist Mono, monospace",
          fill: sourceColor,
        },
        labelBgStyle: { fill: "#FAF8F4", fillOpacity: 0.95, color: sourceColor },
        labelBgPadding: [5, 3] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    // Containment edges (parent → child) as dashed lines
    const containmentEdges: Edge[] = filteredEntities
      .filter(e => e.parentId && filteredEntityIds.has(e.parentId))
      .map(e => {
        const isActive = activeNodeId === e.id || activeNodeId === e.parentId;
        const isDimmed = hasActive && !isActive;
        const parentType = filteredEntities.find(p => p.id === e.parentId)?.type;
        const childType = e.type;
        const sourceColor = parentType ? resolveGroup(parentType, groups).color : "#78716C";
        const targetColor = childType ? resolveGroup(childType, groups).color : "#78716C";
        const srcPos = positions[e.parentId!];
        const tgtPos = positions[e.id];
        return {
          id: `contain-${e.id}`,
          source: e.parentId!,
          target: e.id,
          sourceHandle: srcPos && tgtPos ? getHandle(srcPos, tgtPos, "") : undefined,
          targetHandle: srcPos && tgtPos ? getHandle(tgtPos, srcPos, "t-") : undefined,
          label: isActive ? "∈" : undefined,
          type: "dualColor",
          data: {
            sourceColor: isActive ? sourceColor : "#A8A29E",
            targetColor: isActive ? targetColor : "#A8A29E",
          },
          style: {
            strokeWidth: isActive ? 2 : 1,
            strokeDasharray: "4 3",
            opacity: isDimmed ? 0.06 : isActive ? 0.8 : 0.25,
            transition: "stroke-width 0.15s, opacity 0.15s",
          },
          labelStyle: { fontSize: 10, fontWeight: 600, fill: sourceColor },
          labelBgStyle: { fill: "#FAF8F4", fillOpacity: 0.9 },
          labelBgPadding: [3, 2] as [number, number],
          labelBgBorderRadius: 3,
        };
      });

    return [...relEdges, ...containmentEdges];
  }, [filteredRelations, activeEdgeIds, activeNodeId, filteredEntities, filteredEntityIds, groups, positions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Track user-dragged positions so they persist across re-renders
  const handleNodesChange = useCallback((changes: NodeChange<Node<GraphNodeData>>[]) => {
    onNodesChange(changes);
    // Capture position changes from drag
    for (const change of changes) {
      if (change.type === 'position' && 'position' in change && change.position && change.id) {
        setUserPositions(prev => ({
          ...prev,
          [change.id]: { x: change.position!.x, y: change.position!.y },
        }));
      }
    }
  }, [onNodesChange]);

  // Only apply layout positions for NEW nodes (not yet in userPositions)
  useEffect(() => {
    setNodes(prev => prev.map(n => {
      const up = userPositions[n.id];
      if (up) return { ...n, position: up };
      const lp = positions[n.id];
      if (lp) return { ...n, position: lp };
      return n;
    }));
  }, [positions, userPositions, setNodes]);

  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);
  useEffect(() => {
    requestAnimationFrame(() => fitView({ padding: 0.3, duration: 300 }));
  }, [initialNodes, fitView]);

  // Obsidian-style: hover instantly highlights
  const handleNodeMouseEnter = useCallback((_e: React.MouseEvent, node: Node) => {
    setHoveredNodeId(String(node.data.entityId));
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Click pins the selection (shows info card)
  const handleNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    const id = String(node.data.entityId);
    setSelectedNodeId(p => p === id ? null : id);
    onNodeClick?.(id);
  }, [onNodeClick]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
  }, []);

  const selEntity = selectedNodeId ? entities.find(e => e.id === selectedNodeId) : null;

  // Relations of selected entity for info card
  const selRelations = useMemo(() => {
    if (!selectedNodeId) return [];
    return filteredRelations
      .filter(r => r.sourceId === selectedNodeId || r.targetId === selectedNodeId)
      .map(r => ({
        label: r.label,
        entity: r.sourceId === selectedNodeId
          ? entities.find(e => e.id === r.targetId)
          : entities.find(e => e.id === r.sourceId),
      }));
  }, [selectedNodeId, filteredRelations, entities]);

  // Build type filters from actual entity types present in data
  const typeFilters: { key: TypeFilter; label: string; color?: string }[] = useMemo(() => {
    const presentTypes = Array.from(new Set(entities.map(e => e.type)));
    return [
      { key: "all", label: t("graphView.all") },
      ...presentTypes.map(t => {
        const g = resolveGroup(t, groups);
        return { key: t as TypeFilter, label: g.name, color: g.color };
      }),
    ];
  }, [entities, groups, t]);

  return (
    <div className="w-full h-full bg-surface rounded-lg border border-ink-3/15 overflow-hidden relative">
      {/* Type filter — scrollable on mobile */}
      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-auto z-20" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1 bg-background/90 backdrop-blur-sm border border-ink-3/15 rounded-lg p-0.5 overflow-x-auto no-scrollbar">
          {typeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => { setTypeFilter(f.key); setSelectedNodeId(null); setHoveredNodeId(null); }}
              className={`px-2 py-1.5 sm:px-2.5 rounded-md text-[13px] sm:text-[15px] tracking-[0.12em] uppercase transition-colors flex items-center gap-1 whitespace-nowrap ${
                typeFilter === f.key ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              {f.color && typeFilter !== f.key && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected entity info card — bottom sheet on mobile, side panel on desktop */}
      {selEntity && (
        <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:top-3 sm:right-3 sm:max-w-[240px] z-20 bg-surface/95 backdrop-blur-md border border-ink-3/15 sm:rounded-lg rounded-t-xl px-4 py-3 shadow-lg max-h-[45vh] sm:max-h-none overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: resolveGroup(selEntity.type, groups).color }} />
              <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">{resolveGroup(selEntity.type, groups).name}</span>
            </div>
            <button onClick={() => setSelectedNodeId(null)} className="p-1 rounded hover:bg-ink-3/10 text-ink-3 sm:hidden">
              <X size={16} />
            </button>
          </div>
          <div className="font-serif text-[22px] font-light text-ink leading-tight mb-1.5">{selEntity.name}</div>
          {selEntity.description && (
            <p className="text-[17px] text-ink-2 leading-relaxed line-clamp-4 mb-2">{selEntity.description}</p>
          )}
          {/* Connection list */}
          {selRelations.length > 0 && (
            <div className="border-t border-ink-3/10 pt-2 space-y-1.5">
              <span className="text-[14px] tracking-[0.15em] uppercase text-ink-3">{t("graphView.relationsCount", { count: selRelations.length })}</span>
              {selRelations.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[16px]">
                  <span className="text-ink">{selEntity.name}</span>
                  <span className="text-accent font-medium">→</span>
                  <span className="text-ink-3">{r.label}</span>
                  <span className="text-accent font-medium">→</span>
                  <span className="text-ink">{r.entity?.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint — hidden on mobile to save space */}
      {!activeNodeId && !selectedNodeId && (
        <div className="hidden sm:block absolute bottom-3 left-3 z-20 bg-surface/90 backdrop-blur-sm border border-ink-3/15 rounded-lg px-3 py-1.5 text-[15px] tracking-[0.12em] uppercase text-ink-3">
          {t("graphView.hint")}
        </div>
      )}

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1} maxZoom={4} proOptions={{ hideAttribution: true }}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        selectionOnDrag={false}
        panOnScroll={false}
        preventScrolling={true}
      >
        <Background color="#A8A29E30" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-surface !border-ink-3/20 !rounded-lg hidden sm:flex"
        />
        {/* Mobile zoom buttons */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 sm:hidden">
          <button
            onClick={() => fitView({ padding: 0.3, duration: 300 })}
            className="w-10 h-10 bg-surface/90 backdrop-blur-sm border border-ink-3/15 rounded-lg flex items-center justify-center text-ink-2 active:bg-ink-3/10"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="8" y1="6" x2="8" y2="10"/></svg>
          </button>
        </div>
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as GraphNodeData | undefined;
            const t = (d as GraphNodeData)?.type as string;
            if (activeNodeId && !activeNeighborIds.has(node.id)) return "#D6D3D1";
            return resolveGroup(t, groups).color || "#A8A29E";
          }}
          maskColor="rgba(242, 238, 232, 0.8)"
          className="!bg-surface !border-ink-3/20 !rounded-lg hidden sm:block"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
