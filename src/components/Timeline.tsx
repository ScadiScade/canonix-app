"use client";

import { useState, useMemo } from "react";
import { EntityGroupData, TimelineScaleData, TimelineEra, resolveGroup } from "@/lib/types";
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
  timelineScales?: TimelineScaleData[];
  onSelect?: (id: string) => void;
}

function parseDateWithEras(dateStr: string, eras: TimelineEra[]): number {
  if (eras.length === 0) {
    // Fallback: built-in parsing
    const match = dateStr.match(/(-?\d+)\s*(BBY|ABY|BC|AD|BCE|CE|г|лет|до н)/i);
    if (!match) {
      const num = parseInt(dateStr);
      return isNaN(num) ? 0 : num;
    }
    const num = parseInt(match[1]);
    const isBby = /BBY|BC|BCE|до н/i.test(dateStr);
    return isBby ? -num : num;
  }

  // Try matching against defined eras
  for (const era of eras) {
    const re = new RegExp(`(-?\\d+)\\s*${era.abbreviation}`, "i");
    const match = dateStr.match(re);
    if (match) {
      const num = parseInt(match[1]);
      if (era.direction === "backward") {
        return era.offset - num; // e.g. BBY: offset=0, 5 BBY → -5
      }
      return era.offset + num; // e.g. ABY: offset=0, 5 ABY → 5
    }
  }

  // Try plain number
  const num = parseInt(dateStr);
  return isNaN(num) ? 0 : num;
}

function getEraForDate(sortKey: number, eras: TimelineEra[]): TimelineEra | null {
  if (eras.length === 0) return null;
  // Find which era this sortKey falls into
  for (let i = eras.length - 1; i >= 0; i--) {
    if (sortKey >= eras[i].offset) return eras[i];
  }
  return eras[0] || null;
}

export function Timeline({ entities, groups = [], timelineScales = [], onSelect }: TimelineProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<TimelineMode>("chronological");
  const [activeScaleId, setActiveScaleId] = useState<string | null>(
    timelineScales.find(s => s.isDefault)?.id || timelineScales[0]?.id || null
  );

  const activeScale = timelineScales.find(s => s.id === activeScaleId) || null;
  const eras = useMemo(() => activeScale?.eras || [], [activeScale]);

  // Deduplicate by id and filter out entities without valid dates
  const seen = new Set<string>();
  const dated = entities
    .filter(e => {
      if (!e.date || e.date.trim() === "") return false;
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map(e => ({ ...e, sortKey: parseDateWithEras(e.date!, eras) }))
    .sort((a, b) => a.sortKey - b.sortKey);

  // Group entities by era for visual sections
  const eraSections = useMemo(() => {
    if (eras.length === 0) return [];
    const sections: { era: TimelineEra; entities: typeof dated }[] = [];
    for (const era of eras) {
      const eraEntities = dated.filter(e => {
        const eEra = getEraForDate(e.sortKey, eras);
        return eEra?.abbreviation === era.abbreviation;
      });
      if (eraEntities.length > 0) {
        sections.push({ era, entities: eraEntities });
      }
    }
    return sections;
  }, [dated, eras]);

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
      {/* Scale selector + Mode switcher */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {timelineScales.length > 0 && (
          <div className="flex items-center gap-1 mr-2">
            {timelineScales.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveScaleId(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[13px] tracking-[0.08em] uppercase transition-colors ${
                  activeScaleId === s.id ? "bg-ink text-white" : "text-ink-3 hover:text-ink hover:bg-ink-3/5"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {timelineScales.length === 0 && (
          <div className="text-[13px] text-ink-3 mr-2 italic">
            {t("timeline.noScaleHint")}
          </div>
        )}
        <div className="flex items-center gap-1">
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
      </div>

      {mode === "chronological" && (
        <div className="relative pl-8 py-4">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-3/20" />
          {/* Era section headers */}
          {eraSections.length > 0 ? eraSections.map(({ era, entities: eraEntities }) => (
            <div key={era.abbreviation}>
              <div className="relative mb-4">
                <div className="absolute -left-5.5 top-1 w-3 h-3 rounded-full border-2 border-accent bg-accent/20" />
                <span className="text-[17px] tracking-[0.2em] uppercase text-accent font-medium block ml-1">{era.name} ({era.abbreviation})</span>
              </div>
              {eraEntities.map((e) => {
                const color = resolveGroup(e.type, groups).color;
                return (
                  <div key={e.id} className="relative mb-5 cursor-pointer group" onClick={() => onSelect?.(e.id)}>
                    <div className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-surface" style={{ backgroundColor: color }} />
                    <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-0.5">{e.date}</span>
                    <div className="bg-surface rounded-lg p-3 border border-ink-3/10 group-hover:border-ink-3/25 transition-colors ml-2">
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
          )) : dated.map((e) => {
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
