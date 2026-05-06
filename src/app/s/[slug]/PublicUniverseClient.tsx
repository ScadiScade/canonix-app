"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { EntityGroupData } from "@/lib/types";
import { EntityCard } from "@/components/EntityCard";
import { Timeline } from "@/components/Timeline";
import { LayoutGrid, GitBranch, Clock, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { safeJsonParse } from "@/lib/safeJson";

const GraphView = dynamic(() => import("@/components/GraphView").then(m => ({ default: m.GraphView })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">{""}</div>,
});

type ViewMode = "grid" | "graph" | "timeline";

interface PublicUniverseClientProps {
  universe: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    groups?: { id: string; name: string; slug: string; color: string; icon: string; fields: string }[];
    entities: {
      id: string;
      name: string;
      type: string;
      description?: string | null;
      date?: string | null;
      customFields: string;
      notes: string;
      sourceRelations: { id: string; label: string; target: { id: string; name: string; type: string } }[];
      targetRelations: { id: string; label: string; source: { id: string; name: string; type: string } }[];
    }[];
    relations: { id: string; sourceId: string; targetId: string; label: string }[];
  };
}

export default function PublicUniverseClient({ universe }: PublicUniverseClientProps) {
  const { t } = useLocale();
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useModalBehavior(!!selectedId, () => setSelectedId(null));

  const groups: EntityGroupData[] = (universe.groups || []).map(g => ({ ...g, fields: safeJsonParse(g.fields, []) }));

  const filtered = universe.entities.filter(e => {
    if (filter !== "all" && e.type !== filter) return false;
    return true;
  });

  const selected = selectedId ? universe.entities.find(e => e.id === selectedId) : null;

  return (
    <div className="min-h-screen bg-background">
      <div id="main-content" className="flex h-screen pt-topbar">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-7 pt-6 pb-4">
            <h1 className="font-serif text-[30px] font-light text-ink leading-tight">{universe.name}</h1>
            {universe.description && (
              <p className="text-ink-2 text-[13px] mt-1">{universe.description}</p>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex bg-surface rounded-xl border border-ink-3/15 p-0.5">
                {([
                  ["grid", LayoutGrid, "Bento"],
                  ["graph", GitBranch, t("public.graph")],
                  ["timeline", Clock, t("public.timeline")],
                ] as const).map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode as ViewMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] tracking-[0.1em] uppercase transition-colors ${
                      view === mode ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] tracking-[0.2em] uppercase transition-colors ${
                    filter === "all" ? "bg-ink text-surface" : "bg-surface text-ink-2 hover:text-ink border border-ink-3/15"
                  }`}
                >
                  {t("public.all")}
                </button>
                {groups.map(g => (
                  <button
                    key={g.slug}
                    onClick={() => setFilter(g.slug)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] tracking-[0.2em] uppercase transition-colors flex items-center gap-1 ${
                      filter === g.slug ? "text-white" : "text-ink-2 hover:text-ink border border-ink-3/15"
                    }`}
                    style={filter === g.slug ? { backgroundColor: g.color } : undefined}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-7 pb-7">
            {view === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[10px]">
                {filtered.map(e => (
                  <EntityCard
                    key={e.id}
                    entity={e}
                    groups={groups}
                    compact
                    onClick={() => setSelectedId(e.id)}
                  />
                ))}
              </div>
            )}

            {view === "graph" && (
              <div className="h-[calc(100vh-200px)]">
                <GraphView
                  entities={filtered}
                  relations={universe.relations.filter(r =>
                    filtered.some(e => e.id === r.sourceId) && filtered.some(e => e.id === r.targetId)
                  )}
                  groups={groups}
                  onNodeClick={setSelectedId}
                />
              </div>
            )}

            {view === "timeline" && (
              <div className="max-w-xl">
                <Timeline entities={filtered} groups={groups} onSelect={setSelectedId} />
              </div>
            )}
          </div>
        </div>

        {/* Entity detail — centered modal */}
        {selected && (
          <div
            className="fixed inset-0 bg-ink/40 dark:bg-white/20 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedId(null)}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] bg-surface rounded-xl border border-ink-3/15 shadow-2xl overflow-hidden flex flex-col min-h-0"
              style={{ animation: "scaleIn 0.15s ease-out" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-end px-5 py-3 border-b border-ink-3/10 flex-shrink-0">
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label={t("common.close")}
                  className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-ink transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-6">
                <EntityCard entity={selected} groups={groups} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
