"use client";

import { EntityGroupData, resolveGroup } from "@/lib/types";
import { TypePill } from "./TypePill";
import { useLocale } from "@/lib/i18n";

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
  const match = dateStr.match(/(\d+)\s*(BBY|ABY|BC|AD|г|лет)/i);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const isBby = /BBY|BC|до н/i.test(dateStr);
  return isBby ? -num : num;
}

export function Timeline({ entities, groups = [], onSelect }: TimelineProps) {
  const { t } = useLocale();
  const dated = entities
    .filter(e => e.date)
    .map(e => ({ ...e, sortKey: parseDate(e.date!) }))
    .sort((a, b) => a.sortKey - b.sortKey);

  if (dated.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-ink-3 text-[17px]">
        {t("timeline.noDatedEvents")}
      </div>
    );
  }

  return (
    <div className="relative pl-8 py-4">
      {/* Vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-3/20" />

      {dated.map((e) => {
        const color = resolveGroup(e.type, groups).color;
        return (
          <div
            key={e.id}
            className="relative mb-6 cursor-pointer group"
            onClick={() => onSelect?.(e.id)}
          >
            {/* Dot */}
            <div
              className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-surface"
              style={{ backgroundColor: color }}
            />

            {/* Date label */}
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-0.5">
              {e.date}
            </span>

            {/* Content */}
            <div className="bg-surface rounded-lg p-3 border border-ink-3/10 group-hover:border-ink-3/25 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-serif text-[20px] font-light text-ink">{e.name}</span>
                <TypePill type={e.type} groups={groups} />
              </div>
              {e.description && (
                <p className="text-[17px] text-ink-2">{e.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
