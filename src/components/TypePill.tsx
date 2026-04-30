"use client";

import { EntityGroupData, resolveGroup } from "@/lib/types";

interface TypePillProps {
  type: string;
  groups?: EntityGroupData[];
  size?: "sm" | "md";
}

export function TypePill({ type, groups = [], size = "sm" }: TypePillProps) {
  const g = resolveGroup(type, groups);
  const color = g.color;
  const isSm = size === "sm";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm font-mono tracking-[0.2em] uppercase"
      style={{
        color,
        backgroundColor: `${color}12`,
        fontSize: isSm ? "9px" : "10px",
        padding: isSm ? "2px 6px" : "3px 8px",
      }}
    >
      {g.name}
    </span>
  );
}
