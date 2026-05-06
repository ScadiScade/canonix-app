"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  iconColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  iconColor = "var(--accent)",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: iconColor + "15" }}
      >
        <Icon size={28} style={{ color: iconColor }} />
      </div>
      <h3 className="font-serif text-[22px] md:text-[26px] font-light text-ink mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-ink-2 text-[15px] md:text-[17px] leading-relaxed max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button as="link" href={actionHref} variant="primary" size="md">
            {actionLabel}
          </Button>
        ) : (
          <Button onClick={onAction} variant="primary" size="md">
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
