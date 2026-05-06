"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = ButtonBaseProps & {
  as?: "button";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

type ButtonAsLink = ButtonBaseProps & {
  as: "link";
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/15 accent-shimmer",
  secondary:
    "bg-surface text-ink border border-ink-3/20 hover:border-ink-3/40 hover:bg-ink-3/3",
  ghost:
    "bg-transparent text-ink-2 hover:text-accent hover:bg-accent-light",
  danger:
    "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[14px]",
  md: "px-8 py-3.5 text-[15px]",
  lg: "px-10 py-4 text-[17px]",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    icon: Icon,
    iconRight = false,
    fullWidth = false,
    disabled = false,
    loading = false,
    className = "",
    children,
  } = props;

  const baseClasses = [
    "inline-flex items-center justify-center gap-2 rounded-xl",
    "tracking-[0.1em] uppercase no-underline",
    "btn-press transition-colors duration-150",
    variant === "primary" ? "hover-glow" : "",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "",
    disabled || loading ? "opacity-50 cursor-not-allowed" : "",
    className,
  ].join(" ");

  const content = (
    <>
      {Icon && !iconRight && (
        <Icon size={size === "sm" ? 12 : 14} className="flex-shrink-0" />
      )}
      <span>{loading ? "..." : children}</span>
      {Icon && iconRight && (
        <Icon size={size === "sm" ? 12 : 14} className="flex-shrink-0" />
      )}
    </>
  );

  if (props.as === "link") {
    return (
      <Link href={props.href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={disabled || loading}
      className={baseClasses}
    >
      {content}
    </button>
  );
}
