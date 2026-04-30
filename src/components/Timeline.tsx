"use client";

import { useState } from "react";
import { EntityGroupData, resolveGroup } from "@/lib/types";
import { TypePill } from "./TypePill";
import { useLocale } from "@/lib/i18n";

type TimelineMode = "chronological" | "byGroup" | "compact";

interface TimelineProps {
  entities: {
    id: string;
    name: string;
    type: string;
    date?: string | null;
    description?: string | null;
  }[];
  groups?: EntityGroupData[];
  onSelect?: (id: string) => void;
}

function parseDate(dateStr: string): number {
  const match = dateStr.match(/(-?\d+)\s*(BBY|ABY|BC|AD|BCE|CE|г|лет|до н)/i);
  if (!match) {
    const num = parseInt(dateStr);
    return isNaN(num) ? 0 : num;
  }
  const num = parseInt(match[1]);
  const isBby = /BBY|BC|BCE|до н/i.test(dateStr);
  return isBby ? -num : num;
}

export function Timeline({ entities, groups = [], onSelect }: TimelineProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<TimelineMode>("chronological");

  // Deduplicate by id and filter out entities without valid dates
  const seen = new Set<string>();
  const dated = entities
    .filter(e => {
      if (!e.date || e.date.trim() === "") return false;
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map(e => ({ ...e, sortKey: parseDate(e.date!) }))
    .sort((a, b) => a.sortKey - b.sortKey);

  if (dated.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-ink-3 text-[17px]">
        {t("timeline.noDatedEvents")}
      </div>
    );
  }

  const modes: { id: TimelineMode; label: string }[] = [
    { id: "chronological", label: t("timeline.chronological") },
    { id: "byGroup", label: t("timeline.byGroup") },
    { id: "compact", label: t("timeline.compact") },
  ];

  return (
    <div>
      {/* Mode switcher */}
      <div className="flex items-center gap-1 mb-4">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-2.5 py-1 rounded-lg text-[13px] tracking-[0.08em] uppercase transition-colors ${
              mode === m.id ? "bg-accent text-white" : "text-ink-3 hover:text-ink hover:bg-ink-3/5"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "chronological" && (
        <div className="relative pl-8 py-4">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-3/20" />
          {dated.map((e) => {
            const color = resolveGroup(e.type, groups).color;
            return (
              <div key={e.id} className="relative mb-6 cursor-pointer group" onClick={() => onSelect?.(e.id)}>
                <div className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-surface" style={{ backgroundColor: color }} />
                <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-0.5">{e.date}</span>
                <div className="bg-surface rounded-lg p-3 border border-ink-3/10 group-hover:border-ink-3/25 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif text-[20px] font-light text-ink">{e.name}</span>
                    <TypePill type={e.type} groups={groups} />
                  </div>
                  {e.description && <p className="text-[17px] text-ink-2">{e.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "byGroup" && (
        <div className="space-y-6">
          {groups.map(g => {
            const groupEntities = dated.filter(e => e.type === g.slug);
            if (groupEntities.length === 0) return null;
            return (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 font-medium">{g.name}</span>
                  <span className="text-[13px] text-ink-3/60">{groupEntities.length}</span>
                </div>
                <div className="relative pl-8 py-2">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-3/15" />
                  {groupEntities.map(e => (
                    <div key={e.id} className="relative mb-4 cursor-pointer group" onClick={() => onSelect?.(e.id)}>
                      <div className="absolute -left-5.5 top-1 w-2 h-2 rounded-full border-2 border-surface" style={{ backgroundColor: g.color }} />
                      <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-0.5">{e.date}</span>
                      <div className="bg-surface rounded-lg p-2.5 border border-ink-3/10 group-hover:border-ink-3/25 transition-colors">
                        <span className="font-serif text-[18px] font-light text-ink">{e.name}</span>
                        {e.description && <p className="text-[15px] text-ink-2 mt-0.5 line-clamp-2">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Entities without a matching group */}
          {(() => {
            const groupSlugs = new Set(groups.map(g => g.slug));
            const ungrouped = dated.filter(e => !groupSlugs.has(e.type));
            if (ungrouped.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-ink-3/30" />
                  <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 font-medium">{t("timeline.other")}</span>
                  <span className="text-[13px] text-ink-3/60">{ungrouped.length}</span>
                </div>
                <div className="relative pl-8 py-2">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-3/15" />
                  {ungrouped.map(e => (
                    <div key={e.id} className="relative mb-4 cursor-pointer group" onClick={() => onSelect?.(e.id)}>
                      <div className="absolute -left-5.5 top-1 w-2 h-2 rounded-full border-2 border-surface bg-ink-3/30" />
                      <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-0.5">{e.date}</span>
                      <div className="bg-surface rounded-lg p-2.5 border border-ink-3/10 group-hover:border-ink-3/25 transition-colors">
                        <span className="font-serif text-[18px] font-light text-ink">{e.name}</span>
                        {e.description && <p className="text-[15px] text-ink-2 mt-0.5 line-clamp-2">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {mode === "compact" && (
        <div className="relative pl-6 py-4">
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-ink-3/20" />
          {dated.map((e) => {
            const color = resolveGroup(e.type, groups).color;
            return (
              <div key={e.id} className="relative mb-2 cursor-pointer group flex items-center gap-2" onClick={() => onSelect?.(e.id)}>
                <div className="absolute -left-4 top-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3 w-20 shrink-0">{e.date}</span>
                <span className="text-[15px] text-ink group-hover:text-accent transition-colors">{e.name}</span>
                <TypePill type={e.type} groups={groups} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
