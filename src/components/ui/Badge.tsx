"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface BadgeProps {
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

const variantMap = {
  default:  "bg-accent text-white",
  accent:   "bg-accent-light text-accent border border-accent/15",
  success:  "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  warning:  "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  danger:   "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  neutral:  "bg-background text-ink-3 border border-ink-3/10",
};

const sizeMap = {
  sm: "px-1.5 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-[13px]",
};

export function Badge({ label, icon: Icon, variant = "neutral", size = "sm", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md",
        "tracking-[0.15em] uppercase",
        variantMap[variant],
        sizeMap[size],
        className,
      ].join(" ")}
    >
      {Icon && <Icon size={size === "sm" ? 8 : 10} className="flex-shrink-0" />}
      {label}
    </span>
  );
}
