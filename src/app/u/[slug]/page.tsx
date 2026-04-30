"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { EntityType, EntityGroupData } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { EntityCard } from "@/components/EntityCard";
import { EntityDetail } from "@/components/EntityDetail";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EntityForm } from "@/components/EntityForm";
import { Timeline } from "@/components/Timeline";
import { RelationForm } from "@/components/RelationForm";
import { UniverseSettings } from "@/components/UniverseSettings";
import { AiAssistant } from "@/components/AiAssistant";
import { GroupForm } from "@/components/GroupForm";
import { useLocale } from "@/lib/i18n";
import { useToast, ToastProvider } from "@/components/Toast";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { safeJsonParse } from "@/lib/safeJson";
import {
  Plus,
  LayoutGrid,
  GitBranch,
  Clock,
  Search,
  Settings,
  Share2,
  X,
} from "lucide-react";

const GraphView = dynamic(() => import("@/components/GraphView").then(m => ({ default: m.GraphView })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">Loading graph…</div>,
});

type ViewMode = "grid" | "graph" | "timeline";

interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string | null;
  date?: string | null;
  customFields: string;
  notes: string;
  imageUrl?: string | null;
  sourceRelations: { id: string; label: string; target: { id: string; name: string; type: EntityType } }[];
  targetRelations: { id: string; label: string; source: { id: string; name: string; type: EntityType } }[];
}

function EntityDetailModal({ selected, groups, onClose, onAddRelation, onEdit, onDelete, onNavigate, onUpdateNotes }: {
  selected: Entity;
  groups: EntityGroupData[];
  onClose: () => void;
  onAddRelation: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigate: (id: string) => void;
  onUpdateNotes: (notes: string) => void;
}) {
  const { t } = useLocale();
  useModalBehavior(true, onClose);

  return (
    <div
      className="fixed inset-0 bg-ink/40 dark:bg-white/20 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={selected.name}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-surface sm:rounded-xl rounded-t-2xl border border-ink-3/15 shadow-2xl overflow-hidden flex flex-col min-h-0"
        style={{ animation: "scaleIn 0.15s ease-out" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-3/10 flex-shrink-0">
          <div className="w-8 h-1 bg-ink-3/30 rounded-full sm:hidden" />
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-ink transition-colors ml-auto"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <EntityDetail
            entity={selected}
            groups={groups}
            onAddRelation={onAddRelation}
            onEdit={onEdit}
            onDelete={onDelete}
            onNavigate={onNavigate}
            onUpdateNotes={onUpdateNotes}
          />
        </div>
      </div>
    </div>
  );
}

interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

interface GroupData {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  fields: string;
}

interface UniverseData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: string;
  license: string;
  price: number;
  listedAt: string | null;
  entities: Entity[];
  relations: Relation[];
  groups: GroupData[];
}

function UniversePageInner({ params }: { params: { slug: string } }) {
  const { t } = useLocale();
  const slug = params.slug;
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<EntityType | "all">("all");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<EntityType | null>(null);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [showRelForm, setShowRelForm] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const closeForm = useCallback(() => { setShowForm(null); setEditEntity(null); }, []);
  useModalBehavior(!!showForm, closeForm);

  const fetchUniverse = useCallback(async () => {
    try {
      const res = await fetch(`/api/universes/${slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUniverse(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchUniverse(); }, [fetchUniverse]);

  // Parse groups from universe data
  const groups: EntityGroupData[] = useMemo(() => {
    if (!universe) return [];
    if (universe.groups.length === 0) return [];
    return universe.groups.map(g => ({ ...g, fields: safeJsonParse(g.fields, []) }));
  }, [universe]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showForm) { setShowForm(null); setEditEntity(null); return; }
        if (showRelForm) { setShowRelForm(null); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (selectedId) { setSelectedId(null); return; }
      }
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey && !showForm && !showRelForm && !showSettings) {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
        setShowForm(groups[0]?.slug || "");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showForm, showRelForm, showSettings, selectedId, groups]);

  const filtered = universe?.entities.filter(e => {
    if (filter !== "all" && e.type !== filter) return false;
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const selected = selectedId ? universe?.entities.find(e => e.id === selectedId) : null;

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/entities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowForm(null);
    fetchUniverse();
    if (res.ok) toast(t("universe.entityCreated"));
    else toast(t("common.error"), "error");
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/entities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setEditEntity(null);
    setSelectedId(null);
    fetchUniverse();
    if (res.ok) toast(t("universe.entityUpdated"));
    else toast(t("common.error"), "error");
  };

  const [deleteEntityTarget, setDeleteEntityTarget] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteEntityTarget(id);
  };

  const confirmDeleteEntity = async () => {
    if (!deleteEntityTarget) return;
    const res = await fetch(`/api/entities?id=${deleteEntityTarget}`, { method: "DELETE" });
    setDeleteEntityTarget(null);
    setSelectedId(null);
    fetchUniverse();
    if (res.ok) toast(t("universe.entityDeleted"), "info");
    else toast(t("common.error"), "error");
  };

  const handleAddRelation = async (data: { sourceId: string; targetId: string; label: string; universeId: string }) => {
    const res = await fetch("/api/relations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowRelForm(null);
    fetchUniverse();
    if (res.ok) toast(t("universe.relationAdded"));
    else toast(t("common.error"), "error");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-ink-3 text-[13px] tracking-[0.2em] uppercase">{t("common.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-[14px] mb-2">{t("common.error")}: {error}</div>
          <button onClick={fetchUniverse} className="text-accent text-[13px] hover:underline">{t("universe.retry")}</button>
        </div>
      </div>
    );
  }

  if (!universe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-ink-3 text-[13px]">{t("universe.notFound")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar universeName={universe.name} universeSlug={universe.slug} />

      <main id="main-content" className="flex flex-col md:flex-row h-screen">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Universe header */}
          <div className="px-4 md:px-7 pt-4 md:pt-6 pb-3 md:pb-4">
            <h1 className="font-serif text-[30px] font-light text-ink leading-tight">
              {universe.name}
            </h1>
            {universe.description && (
              <p className="text-ink-2 text-[13px] mt-1">{universe.description}</p>
            )}

            {/* Toolbar */}
            <div className="mt-3 md:mt-4 space-y-2">
              {/* Row 1: View switcher + actions */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* View switcher */}
                <div className="flex bg-surface rounded-xl border border-ink-3/15 p-0.5">
                  {([
                    ["grid", LayoutGrid, "Bento"],
                    ["graph", GitBranch, t("universe.graph")],
                    ["timeline", Clock, t("universe.timeline")],
                  ] as const).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode as ViewMode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] tracking-[0.1em] uppercase transition-colors ${
                        view === mode ? "bg-accent text-white" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      <Icon size={12} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 md:flex-none md:w-44">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      if (searchTimer.current) clearTimeout(searchTimer.current);
                      searchTimer.current = setTimeout(() => setSearchQuery(e.target.value), 200);
                    }}
                    placeholder={t("universe.searchPlaceholder")}
                    className="bg-surface border border-ink-3/15 rounded-xl pl-7 pr-3 py-1.5 text-[13px] text-ink focus:outline-none focus:border-accent w-full"
                  />
                </div>

                {/* Universe actions */}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/s/${universe.slug}`);
                      toast(t("universe.linkCopied"), "info");
                    }}
                    className="p-2 rounded-lg hover:bg-ink-3/10 text-ink-3 hover:text-accent transition-colors"
                    title={t("universe.share")}
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg hover:bg-ink-3/10 text-ink-3 hover:text-ink transition-colors"
                    title={t("universe.settings")}
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => setShowForm(groups[0]?.slug || "character")}
                    className="flex items-center gap-1.5 bg-accent text-white rounded-xl px-3 py-2 text-[12px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors"
                  >
                    <Plus size={12} />
                    <span className="hidden sm:inline">{t("universe.entity")}</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Type filters */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] tracking-[0.2em] uppercase transition-colors ${
                    filter === "all" ? "bg-ink text-surface" : "bg-surface text-ink-2 hover:text-ink border border-ink-3/15"
                  }`}
                >
                  {t("universe.all")}
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
                <button
                  onClick={() => setShowGroupForm(true)}
                  className="px-2 py-1 rounded-xl text-[11px] tracking-[0.2em] uppercase text-ink-3 hover:text-ink border border-dashed border-ink-3/20 hover:border-ink-3/40 transition-colors"
                  title={t("universe.manageGroups")}
                >
                  + {t("universe.group")}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-4 md:px-7 pb-4 md:pb-7">
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
                {filtered.length === 0 && universe.entities.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="text-ink-3 text-[13px] mb-4">{t("universe.emptyHint")}</div>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {groups.map(g => (
                        <button
                          key={g.slug}
                          onClick={() => setShowForm(g.slug)}
                          className="px-3 py-1.5 rounded-xl text-[11px] tracking-[0.2em] uppercase bg-surface border border-ink-3/15 text-ink-2 hover:text-ink hover:border-ink-3/30 transition-colors flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                          + {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filtered.length === 0 && universe.entities.length > 0 && (
                  <div className="col-span-full text-center py-12 text-ink-3 text-[13px]">
                    {t("universe.nothingFound")}
                  </div>
                )}
              </div>
            )}

            {view === "graph" && (
              <div className="h-[calc(100vh-220px)] sm:h-[calc(100vh-200px)]">
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
                <Timeline
                  entities={filtered}
                  groups={groups}
                  onSelect={setSelectedId}
                />
              </div>
            )}
          </div>
        </div>

        {/* Entity detail — centered modal */}
        {selected && (
          <EntityDetailModal
            selected={selected}
            groups={groups}
            onClose={() => setSelectedId(null)}
            onAddRelation={() => setShowRelForm(selected.id)}
            onEdit={() => { setEditEntity(selected); setShowForm(selected.type); }}
            onDelete={() => handleDelete(selected.id)}
            onNavigate={(id) => setSelectedId(id)}
            onUpdateNotes={async (notes) => {
              const res = await fetch("/api/entities", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected.id, notes }),
              });
              fetchUniverse();
              if (res.ok) toast(t("universe.noteAdded"));
              else toast(t("common.error"), "error");
            }}
          />
        )}
      </main>

      {/* Create/Edit Entity Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-ink/30 dark:bg-white/20 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => { setShowForm(null); setEditEntity(null); }} role="dialog" aria-modal="true" aria-label={editEntity ? t("entityForm.editEntity") : t("entityForm.newEntity")}>
          <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col min-h-0 bg-surface sm:rounded-lg rounded-t-2xl border border-ink-3/15 shadow-xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: "scaleIn 0.15s ease-out" }}>
            <EntityForm
              type={showForm}
              universeId={universe.id}
              groups={groups}
              initial={editEntity ? {
                id: editEntity.id,
                name: editEntity.name,
                description: editEntity.description || undefined,
                date: editEntity.date || undefined,
                customFields: editEntity.customFields,
                notes: editEntity.notes,
              } : undefined}
              onSubmit={editEntity ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(null); setEditEntity(null); }}
            />
          </div>
        </div>
      )}

      {/* Add Entity Type Selector — show when creating new entity */}
      {showForm && !editEntity && (
        <div className="fixed bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-40 flex gap-1.5 bg-surface rounded-xl border border-ink-3/15 p-1 shadow-lg overflow-x-auto">
          {groups.map(g => (
            <button
              key={g.slug}
              onClick={() => setShowForm(g.slug)}
              className={`px-3 py-1.5 rounded-xl text-[11px] tracking-[0.2em] uppercase transition-colors flex items-center gap-1 whitespace-nowrap ${
                showForm === g.slug ? "text-white" : "text-ink-2 hover:text-ink"
              }`}
              style={showForm === g.slug ? { backgroundColor: g.color } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Relation Form Modal */}
      {showRelForm && (
        <RelationForm
          entities={universe.entities}
          universeId={universe.id}
          sourceId={showRelForm}
          onSubmit={handleAddRelation}
          onCancel={() => setShowRelForm(null)}
        />
      )}

      {/* Universe Settings */}
      {showSettings && (
        <UniverseSettings
          universe={universe}
          onUpdate={async (data) => {
            const res = await fetch("/api/universes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            fetchUniverse();
            if (res.ok) toast(t("universe.settingsSaved"));
            else toast(t("common.error"), "error");
          }}
          onDelete={async () => {
            const res = await fetch(`/api/universes?id=${universe.id}`, { method: "DELETE" });
            if (res.ok) window.location.href = "/dashboard";
            else toast(t("common.error"), "error");
          }}
          onExport={() => {
            const blob = new Blob([JSON.stringify(universe, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${universe.slug}.json`; a.click();
            URL.revokeObjectURL(url);
            toast(t("universe.exportDone"), "info");
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Group Management Modal */}
      {showGroupForm && (
        <GroupForm
          universeId={universe.id}
          groups={groups}
          onCreated={() => { fetchUniverse(); toast(t("universe.groupCreated")); }}
          onUpdated={() => { fetchUniverse(); toast(t("universe.groupUpdated")); }}
          onDeleted={() => { fetchUniverse(); toast(t("universe.groupDeleted"), "info"); }}
          onClose={() => setShowGroupForm(false)}
        />
      )}

      <AiAssistant
        universeId={universe?.id}
        universeContext={universe ? `${t("ai.source")}: ${universe.name}\n${universe.description || ""}\n${t("ai.entities")}: ${universe.entities.map(e => `${e.name} (${e.type})`).join(", ")}` : undefined}
        groups={groups}
        entities={universe?.entities || []}
        onEntitiesCreated={() => {
          fetchUniverse();
        }}
        onEntityEdited={() => {
          fetchUniverse();
        }}
        onGroupsCreated={() => {
          fetchUniverse();
        }}
      />

      <ConfirmDialog
        open={!!deleteEntityTarget}
        title={t("universe.deleteEntity")}
        message={t("universe.deleteEntityMessage", { name: universe?.entities.find(e => e.id === deleteEntityTarget)?.name || "" })}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDeleteEntity}
        onCancel={() => setDeleteEntityTarget(null)}
      />
    </div>
  );
}

export default function UniversePage(params: { params: { slug: string } }) {
  return (
    <ToastProvider>
      <UniversePageInner {...params} />
    </ToastProvider>
  );
}
