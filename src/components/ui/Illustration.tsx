"use client";

import React from "react";

interface IllustrationProps {
  name: "universe" | "empty" | "search" | "error" | "map";
  className?: string;
  width?: number;
  height?: number;
}

export function Illustration({ name, className = "", width = 240, height = 240 }: IllustrationProps) {
  const illustrations: Record<string, React.ReactNode> = {
    universe: (
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={width} height={height}>
        {/* Background glow */}
        <circle cx="120" cy="120" r="80" fill="url(#uni-glow)" opacity="0.3" />
        {/* Orbits */}
        <ellipse cx="120" cy="120" rx="90" ry="35" stroke="var(--accent)" strokeOpacity="0.15" strokeWidth="1" transform="rotate(-20 120 120)" />
        <ellipse cx="120" cy="120" rx="70" ry="60" stroke="var(--accent)" strokeOpacity="0.1" strokeWidth="1" transform="rotate(30 120 120)" />
        {/* Central planet */}
        <circle cx="120" cy="120" r="28" fill="url(#uni-center)" />
        {/* Small planets */}
        <circle cx="75" cy="85" r="8" fill="#2D5BE3" opacity="0.8" />
        <circle cx="165" cy="95" r="10" fill="#16A34A" opacity="0.7" />
        <circle cx="140" cy="165" r="6" fill="#D97706" opacity="0.8" />
        <circle cx="85" cy="155" r="5" fill="#9333EA" opacity="0.7" />
        {/* Stars */}
        <circle cx="50" cy="60" r="1.5" fill="#A8A29E" opacity="0.6" />
        <circle cx="190" cy="50" r="2" fill="#A8A29E" opacity="0.4" />
        <circle cx="200" cy="180" r="1.5" fill="#A8A29E" opacity="0.5" />
        <circle cx="45" cy="190" r="2" fill="#A8A29E" opacity="0.3" />
        <circle cx="120" cy="40" r="1.5" fill="#A8A29E" opacity="0.5" />
        <defs>
          <radialGradient id="uni-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#2D5BE3" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2D5BE3" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="uni-center" cx="0.3" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#6B8FE8" />
            <stop offset="100%" stopColor="#2D5BE3" />
          </radialGradient>
        </defs>
      </svg>
    ),
    empty: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={width} height={height}>
        <rect x="40" y="60" width="120" height="90" rx="12" stroke="var(--ink-3)" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="8 6" />
        <line x1="60" y1="85" x2="140" y2="85" stroke="var(--ink-3)" strokeOpacity="0.15" strokeWidth="2" />
        <line x1="60" y1="105" x2="120" y2="105" stroke="var(--ink-3)" strokeOpacity="0.15" strokeWidth="2" />
        <line x1="60" y1="125" x2="100" y2="125" stroke="var(--ink-3)" strokeOpacity="0.15" strokeWidth="2" />
        <circle cx="160" cy="55" r="12" fill="var(--accent)" fillOpacity="0.1" />
        <path d="M154 55L158 59L166 51" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={width} height={height}>
        <circle cx="90" cy="90" r="45" stroke="var(--ink-3)" strokeOpacity="0.2" strokeWidth="2" />
        <line x1="125" y1="125" x2="165" y2="165" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
        <circle cx="90" cy="90" r="8" fill="var(--accent)" fillOpacity="0.15" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={width} height={height}>
        <circle cx="100" cy="100" r="60" stroke="#DC2626" strokeOpacity="0.2" strokeWidth="2" />
        <line x1="75" y1="75" x2="125" y2="125" stroke="#DC2626" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
        <line x1="125" y1="75" x2="75" y2="125" stroke="#DC2626" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={width} height={height}>
        {/* Grid lines */}
        <line x1="40" y1="80" x2="200" y2="80" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="40" y1="120" x2="200" y2="120" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="40" y1="160" x2="200" y2="160" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="80" y1="60" x2="80" y2="180" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="120" y1="60" x2="120" y2="180" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="160" y1="60" x2="160" y2="180" stroke="var(--ink-3)" strokeOpacity="0.1" strokeWidth="1" />
        {/* Nodes */}
        <circle cx="80" cy="80" r="8" fill="#2D5BE3" opacity="0.8" />
        <circle cx="160" cy="80" r="8" fill="#16A34A" opacity="0.7" />
        <circle cx="80" cy="160" r="8" fill="#D97706" opacity="0.7" />
        <circle cx="160" cy="160" r="8" fill="#9333EA" opacity="0.7" />
        <circle cx="120" cy="120" r="10" fill="var(--accent)" opacity="0.9" />
        {/* Connections */}
        <line x1="80" y1="80" x2="120" y2="120" stroke="#2D5BE3" strokeOpacity="0.3" strokeWidth="2" />
        <line x1="160" y1="80" x2="120" y2="120" stroke="#16A34A" strokeOpacity="0.3" strokeWidth="2" />
        <line x1="80" y1="160" x2="120" y2="120" stroke="#D97706" strokeOpacity="0.3" strokeWidth="2" />
        <line x1="160" y1="160" x2="120" y2="120" stroke="#9333EA" strokeOpacity="0.3" strokeWidth="2" />
      </svg>
    ),
  };

  return <>{illustrations[name] || null}</>;
}
