"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "accent" | "flat";
  onClick?: () => void;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-[18px_20px]",
  lg: "p-6 md:p-8",
};

const variantMap = {
  default: "bg-surface rounded-lg border border-ink-3/10",
  accent: "bg-accent-light rounded-xl border border-accent/15",
  flat: "bg-background rounded-lg",
};

export function Card({
  children,
  className = "",
  hover = true,
  padding = "md",
  variant = "default",
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        variantMap[variant],
        paddingMap[padding],
        hover ? "hover:border-ink-3/25 hover:shadow-md transition-all hover-lift cursor-default" : "",
        onClick ? "cursor-pointer" : "",
        className,
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-2 ${className}`}>
      <div className="flex-1 min-w-0">
        {typeof title === "string" ? (
          <h3 className="font-serif text-[19px] font-light text-ink truncate">{title}</h3>
        ) : (
          title
        )}
        {subtitle && (
          <p className="text-[13px] text-ink-3 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
