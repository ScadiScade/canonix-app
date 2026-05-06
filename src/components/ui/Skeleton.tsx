"use client";

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  count?: number;
}

export function Skeleton({
  width,
  height,
  circle = false,
  className = "",
  count = 1,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  const baseClass = [
    "skeleton",
    circle ? "rounded-full" : "rounded-md",
    className,
  ].join(" ");

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={baseClass} style={style} />
        ))}
      </>
    );
  }

  return <div className={baseClass} style={style} />;
}

interface SkeletonCardProps {
  lines?: number;
  avatar?: boolean;
  className?: string;
}

export function SkeletonCard({ lines = 3, avatar = false, className = "" }: SkeletonCardProps) {
  return (
    <div className={`bg-surface rounded-lg border border-ink-3/10 p-[18px_20px] ${className}`}>
      {avatar && (
        <div className="flex items-start gap-4 mb-4">
          <Skeleton circle width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      )}
      {!avatar && (
        <>
          <Skeleton width="50%" height={22} className="mb-2" />
          <Skeleton width="70%" height={14} className="mb-3" />
        </>
      )}
      {Array.from({ length: lines - (avatar ? 0 : 2) }).map((_, i) => (
        <Skeleton key={i} width="100%" height={14} className={i > 0 ? "mt-2" : ""} />
      ))}
    </div>
  );
}
