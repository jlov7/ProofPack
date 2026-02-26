'use client';

import { useState, useMemo, useCallback } from 'react';
import type { EventPreview } from '@proofpack/core';

interface MerkleNode {
  id: string;
  label: string;
  level: number;
  x: number;
  y: number;
  isLeaf: boolean;
  leafIndex?: number;
  children: [number, number] | null;
}

function buildTreeLayout(leafCount: number): MerkleNode[] {
  if (leafCount === 0) return [];

  const nodes: MerkleNode[] = [];
  let nodeId = 0;

  // Build leaves
  const leafIndices: number[] = [];
  for (let i = 0; i < leafCount; i++) {
    leafIndices.push(nodeId);
    nodes.push({
      id: `leaf-${i}`,
      label: `E${i + 1}`,
      level: 0,
      x: 0,
      y: 0,
      isLeaf: true,
      leafIndex: i,
      children: null,
    });
    nodeId++;
  }

  // Build internal nodes bottom-up
  let currentLevel = leafIndices;
  let level = 1;

  while (currentLevel.length > 1) {
    const nextLevel: number[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(nodeId);
        nodes.push({
          id: `node-${nodeId}`,
          label: '',
          level,
          x: 0,
          y: 0,
          isLeaf: false,
          children: [currentLevel[i]!, currentLevel[i + 1]!],
        });
        nodeId++;
      } else {
        // Odd node: promote
        nextLevel.push(currentLevel[i]!);
      }
    }
    currentLevel = nextLevel;
    level++;
  }

  // Layout: position nodes
  const maxLevel = level - 1;
  const leafSpacing = 60;
  const levelHeight = 50;

  // Position leaves
  for (let i = 0; i < leafCount; i++) {
    nodes[i]!.x = (i + 0.5) * leafSpacing;
    nodes[i]!.y = maxLevel * levelHeight;
  }

  // Position internal nodes as midpoint of children
  for (let i = leafCount; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.children) {
      const left = nodes[node.children[0]]!;
      const right = nodes[node.children[1]]!;
      node.x = (left.x + right.x) / 2;
      node.y = maxLevel * levelHeight - node.level * levelHeight;
    }
  }

  return nodes;
}

function getProofPath(nodes: MerkleNode[], leafIndex: number): Set<number> {
  const path = new Set<number>();
  path.add(leafIndex);

  // Walk up: find parent of each node in the path
  let current = leafIndex;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    if (node.children && (node.children[0] === current || node.children[1] === current)) {
      path.add(i);
      // Also add sibling
      const sibling = node.children[0] === current ? node.children[1] : node.children[0];
      path.add(sibling);
      current = i;
    }
  }

  return path;
}

export function MerkleViz({ events }: { events: EventPreview[] }) {
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const nodes = useMemo(() => buildTreeLayout(events.length), [events.length]);
  const proofPath = useMemo(
    () => (selectedLeaf !== null ? getProofPath(nodes, selectedLeaf) : new Set<number>()),
    [nodes, selectedLeaf],
  );

  const handleLeafClick = useCallback((index: number) => {
    setSelectedLeaf((prev) => (prev === index ? null : index));
  }, []);

  if (events.length === 0) {
    return <p className="text-[var(--text-muted)] text-sm">No events to visualize.</p>;
  }

  const padding = 20;
  const leafSpacing = 60;
  const svgWidth = events.length * leafSpacing + padding * 2;
  const maxLevel = nodes.reduce((max, n) => Math.max(max, n.level), 0);
  const levelHeight = 50;
  const svgHeight = (maxLevel + 1) * levelHeight + padding * 2;

  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Merkle Tree</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {events.length} leaves — click a leaf to highlight its proof path
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="block mx-auto"
        >
          {/* Edges */}
          {nodes.map((node, i) => {
            if (!node.children) return null;
            const left = nodes[node.children[0]]!;
            const right = nodes[node.children[1]]!;
            const inPath = proofPath.has(i);
            return (
              <g key={`edges-${node.id}`}>
                <line
                  x1={node.x + padding}
                  y1={node.y + padding}
                  x2={left.x + padding}
                  y2={left.y + padding}
                  stroke={
                    inPath && proofPath.has(node.children[0])
                      ? 'var(--accent-green)'
                      : 'var(--border)'
                  }
                  strokeWidth={inPath && proofPath.has(node.children[0]) ? 2 : 1}
                  className="transition-all duration-300"
                />
                <line
                  x1={node.x + padding}
                  y1={node.y + padding}
                  x2={right.x + padding}
                  y2={right.y + padding}
                  stroke={
                    inPath && proofPath.has(node.children[1])
                      ? 'var(--accent-green)'
                      : 'var(--border)'
                  }
                  strokeWidth={inPath && proofPath.has(node.children[1]) ? 2 : 1}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const inPath = proofPath.has(i);
            const isSelected = node.isLeaf && node.leafIndex === selectedLeaf;
            const isHovered = hoveredNode === i;
            const radius = node.isLeaf ? 14 : 10;

            let fill = 'var(--bg-tertiary)';
            let stroke = 'var(--border)';
            if (isSelected) {
              fill = 'var(--accent-green)';
              stroke = 'var(--accent-green)';
            } else if (inPath) {
              fill = 'hsl(145, 70%, 25%)';
              stroke = 'var(--accent-green)';
            }

            return (
              <g
                key={node.id}
                className={`transition-all duration-300 ${node.isLeaf ? 'cursor-pointer' : ''}`}
                onClick={() =>
                  node.isLeaf && node.leafIndex !== undefined && handleLeafClick(node.leafIndex)
                }
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={node.x + padding}
                  cy={node.y + padding}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected || inPath ? 2 : 1}
                />
                {node.isLeaf && (
                  <text
                    x={node.x + padding}
                    y={node.y + padding + 4}
                    textAnchor="middle"
                    className="text-[9px] fill-[var(--text-primary)] font-mono pointer-events-none"
                  >
                    {node.label}
                  </text>
                )}
                {!node.isLeaf && i === nodes.length - 1 && (
                  <text
                    x={node.x + padding}
                    y={node.y + padding - 16}
                    textAnchor="middle"
                    className="text-[9px] fill-[var(--text-muted)] font-mono"
                  >
                    root
                  </text>
                )}
                {/* Tooltip on hover */}
                {isHovered && node.isLeaf && node.leafIndex !== undefined && (
                  <g>
                    <rect
                      x={node.x + padding - 60}
                      y={node.y + padding + 20}
                      width={120}
                      height={22}
                      rx={4}
                      fill="var(--bg-tertiary)"
                      stroke="var(--border)"
                    />
                    <text
                      x={node.x + padding}
                      y={node.y + padding + 34}
                      textAnchor="middle"
                      className="text-[8px] fill-[var(--text-secondary)] font-mono"
                    >
                      {events[node.leafIndex]?.type ?? ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedLeaf !== null && events[selectedLeaf] && (
        <div className="mt-3 p-2 rounded bg-[var(--bg-tertiary)] text-xs">
          <span className="text-[var(--text-muted)]">Proof path for </span>
          <code className="text-[var(--accent-green)] font-mono">{events[selectedLeaf]!.type}</code>
          <span className="text-[var(--text-muted)]"> (leaf {selectedLeaf})</span>
        </div>
      )}
    </div>
  );
}
