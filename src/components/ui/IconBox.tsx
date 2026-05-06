"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { ENTITY_COLORS } from "@/lib/ui/constants";

interface IconBoxProps {
  icon: LucideIcon;
  color?: string | "character" | "place" | "event" | "org" | "item" | "timeline";
  size?: "sm" | "md" | "lg";
  className?: string;
  darkColor?: string;
}

const sizeMap = {
  sm:  { box: "w-6 h-6", icon: 12, rounded: "rounded-md" },
  md:  { box: "w-8 h-8", icon: 15, rounded: "rounded-lg" },
  lg:  { box: "w-12 h-12", icon: 22, rounded: "rounded-xl" },
  xl:  { box: "w-16 h-16", icon: 28, rounded: "rounded-2xl" },
};

function resolveColor(color: IconBoxProps["color"]): { hex: string; bg: string } {
  if (!color) return { hex: "#78716C", bg: "#78716C12" };
  if (color in ENTITY_COLORS) {
    return ENTITY_COLORS[color as keyof typeof ENTITY_COLORS];
  }
  return { hex: color, bg: color + "15" };
}

export function IconBox({ icon: Icon, color, size = "md", className = "", darkColor }: IconBoxProps) {
  const resolved = resolveColor(color);
  const s = sizeMap[size];

  return (
    <div
      className={[
        s.box,
        s.rounded,
        "flex items-center justify-center flex-shrink-0",
        className,
      ].join(" ")}
      style={{ backgroundColor: resolved.bg }}
    >
      {darkColor ? (
        <>
          <Icon size={s.icon} className="dark:hidden" style={{ color: resolved.hex }} />
          <Icon size={s.icon} className="hidden dark:block" style={{ color: darkColor }} />
        </>
      ) : (
        <Icon size={s.icon} style={{ color: resolved.hex }} />
      )}
    </div>
  );
}
