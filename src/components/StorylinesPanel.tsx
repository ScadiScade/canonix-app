"use client";

import { useState } from "react";
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface ChapterData {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StorylineData {
  id: string;
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  chapters: ChapterData[];
  createdAt: string;
  updatedAt: string;
}

interface StorylinesPanelProps {
  universeId: string;
  storylines: StorylineData[];
  entities: { id: string; name: string; type: string }[];
  onRefresh: () => void;
  toast: (msg: string) => void;
}

export function StorylinesPanel({ universeId, storylines, entities, onRefresh, toast }: StorylinesPanelProps) {
  const { t } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#78716C");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#78716C");

  // Chapter state
  const [addingChapterTo, setAddingChapterTo] = useState<string | null>(null);
  const [chapTitle, setChapTitle] = useState("");
  const [chapContent, setChapContent] = useState("");
  const [chapEntityId, setChapEntityId] = useState<string>("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapTitle, setEditChapTitle] = useState("");
  const [editChapContent, setEditChapContent] = useState("");
  const [editChapEntityId, setEditChapEntityId] = useState<string>("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/storylines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, title: newTitle.trim(), description: newDesc, color: newColor }),
      });
      if (res.ok) {
        setNewTitle(""); setNewDesc(""); setNewColor("#78716C");
        onRefresh(); toast(t("storylines.created"));
      }
    } finally { setCreating(false); }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch("/api/storylines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editTitle.trim(), description: editDesc, color: editColor }),
      });
      if (res.ok) { setEditingId(null); onRefresh(); toast(t("storylines.updated")); }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("storylines.confirmDelete"))) return;
    try {
      const res = await fetch("/api/storylines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { onRefresh(); toast(t("storylines.deleted")); }
    } catch {}
  };

  const startEdit = (s: StorylineData) => {
    setEditingId(s.id); setEditTitle(s.title); setEditDesc(s.description); setEditColor(s.color);
  };

  // Chapter CRUD
  const handleCreateChapter = async (storylineId: string) => {
    if (!chapTitle.trim()) return;
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storylineId, title: chapTitle.trim(), content: chapContent, entityId: chapEntityId || undefined }),
      });
      if (res.ok) { setChapTitle(""); setChapContent(""); setChapEntityId(""); setAddingChapterTo(null); onRefresh(); toast(t("storylines.chapterCreated")); }
    } catch {}
  };

  const handleUpdateChapter = async (id: string) => {
    try {
      const res = await fetch("/api/chapters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editChapTitle.trim(), content: editChapContent, entityId: editChapEntityId || null }),
      });
      if (res.ok) { setEditingChapterId(null); onRefresh(); toast(t("storylines.chapterUpdated")); }
    } catch {}
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm(t("storylines.confirmDeleteChapter"))) return;
    try {
      await fetch("/api/chapters", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      onRefresh(); toast(t("storylines.chapterDeleted"));
    } catch {}
  };

  const startEditChapter = (ch: ChapterData) => {
    setEditingChapterId(ch.id); setEditChapTitle(ch.title); setEditChapContent(ch.content); setEditChapEntityId(ch.entityId || "");
  };

  const COLORS = ["#78716C", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-light text-ink tracking-wide">{t("storylines.title")}</h2>
      </div>

      {/* Create storyline */}
      <div className="bg-background border border-ink-3/15 rounded-lg p-3 space-y-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t("storylines.titlePlaceholder")} className="w-full bg-surface border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent" />
        <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={t("storylines.descPlaceholder")} className="w-full h-16 bg-surface border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink resize-none focus:outline-none focus:border-accent" />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink-3">{t("storylines.color")}:</span>
          {COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)} className={`w-5 h-5 rounded-full border-2 transition-colors ${newColor === c ? "border-ink" : "border-transparent"}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="w-full py-2 bg-accent text-white rounded-md text-[15px] flex items-center justify-center gap-1.5 hover:bg-accent/90 disabled:opacity-50">
          <Plus size={14} /> {t("storylines.create")}
        </button>
      </div>

      {/* Storyline list */}
      {storylines.map(s => (
        <div key={s.id} className="bg-background border border-ink-3/15 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-ink-3/5" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {editingId === s.id ? (
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} onClick={e => e.stopPropagation()} className="flex-1 bg-surface border border-ink-3/20 rounded px-2 py-1 text-[15px] text-ink focus:outline-none focus:border-accent" />
            ) : (
              <span className="flex-1 text-[15px] text-ink font-medium">{s.title}</span>
            )}
            <span className="text-[13px] text-ink-3">{s.chapters.length} {t("storylines.chapters")}</span>
            {expandedId === s.id ? <ChevronDown size={14} className="text-ink-3" /> : <ChevronRight size={14} className="text-ink-3" />}
          </div>

          {/* Expanded content */}
          {expandedId === s.id && (
            <div className="border-t border-ink-3/10 px-3 py-3 space-y-2">
              {editingId === s.id ? (
                <div className="space-y-2">
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t("storylines.descPlaceholder")} className="w-full h-16 bg-surface border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink resize-none focus:outline-none focus:border-accent" />
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-ink-3">{t("storylines.color")}:</span>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)} className={`w-5 h-5 rounded-full border-2 transition-colors ${editColor === c ? "border-ink" : "border-transparent"}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(s.id)} className="flex-1 py-1.5 bg-accent text-white rounded-md text-[14px] hover:bg-accent/90">{t("common.save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-surface border border-ink-3/20 text-ink-2 rounded-md text-[14px]">{t("common.cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  {s.description && <p className="text-[14px] text-ink-2 leading-relaxed">{s.description}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(s)} className="text-[13px] text-ink-3 hover:text-ink flex items-center gap-1"><Edit3 size={12} /> {t("common.edit")}</button>
                    <button onClick={() => handleDelete(s.id)} className="text-[13px] text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> {t("common.delete")}</button>
                  </div>
                </>
              )}

              {/* Chapters */}
              <div className="pt-2 border-t border-ink-3/10 space-y-1.5">
                <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3">{t("storylines.chapters")}</span>
                {s.chapters.map(ch => (
                  <div key={ch.id} className="bg-surface border border-ink-3/10 rounded-md p-2.5">
                    {editingChapterId === ch.id ? (
                      <div className="space-y-2">
                        <input value={editChapTitle} onChange={e => setEditChapTitle(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink focus:outline-none focus:border-accent" />
                        <textarea value={editChapContent} onChange={e => setEditChapContent(e.target.value)} className="w-full h-24 bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink resize-none focus:outline-none focus:border-accent" />
                        <select value={editChapEntityId} onChange={e => setEditChapEntityId(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink focus:outline-none focus:border-accent">
                          <option value="">{t("storylines.noEntity")}</option>
                          {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateChapter(ch.id)} className="flex-1 py-1 bg-accent text-white rounded text-[13px] hover:bg-accent/90">{t("common.save")}</button>
                          <button onClick={() => setEditingChapterId(null)} className="px-2 py-1 bg-background border border-ink-3/20 text-ink-2 rounded text-[13px]">{t("common.cancel")}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <BookOpen size={12} className="text-ink-3 flex-shrink-0" />
                          <span className="text-[14px] text-ink font-medium flex-1">{ch.title}</span>
                          {ch.entityId && <span className="text-[12px] text-ink-3 bg-background px-1.5 py-0.5 rounded">{entities.find(e => e.id === ch.entityId)?.name}</span>}
                          <button onClick={() => startEditChapter(ch)} className="text-ink-3 hover:text-ink"><Edit3 size={12} /></button>
                          <button onClick={() => handleDeleteChapter(ch.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                        {ch.content && <p className="text-[13px] text-ink-2 leading-relaxed mt-1 whitespace-pre-wrap line-clamp-5">{ch.content}</p>}
                      </>
                    )}
                  </div>
                ))}

                {/* Add chapter */}
                {addingChapterTo === s.id ? (
                  <div className="bg-surface border border-ink-3/10 rounded-md p-2.5 space-y-2">
                    <input value={chapTitle} onChange={e => setChapTitle(e.target.value)} placeholder={t("storylines.chapterTitlePlaceholder")} className="w-full bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink focus:outline-none focus:border-accent" />
                    <textarea value={chapContent} onChange={e => setChapContent(e.target.value)} placeholder={t("storylines.chapterContentPlaceholder")} className="w-full h-20 bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink resize-none focus:outline-none focus:border-accent" />
                    <select value={chapEntityId} onChange={e => setChapEntityId(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded px-2 py-1 text-[14px] text-ink focus:outline-none focus:border-accent">
                      <option value="">{t("storylines.noEntity")}</option>
                      {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => handleCreateChapter(s.id)} disabled={!chapTitle.trim()} className="flex-1 py-1 bg-accent text-white rounded text-[13px] hover:bg-accent/90 disabled:opacity-50">{t("storylines.addChapter")}</button>
                      <button onClick={() => setAddingChapterTo(null)} className="px-2 py-1 bg-background border border-ink-3/20 text-ink-2 rounded text-[13px]">{t("common.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingChapterTo(s.id)} className="w-full py-1.5 border border-dashed border-ink-3/20 rounded-md text-[13px] text-ink-3 hover:text-ink hover:border-accent/30 flex items-center justify-center gap-1">
                    <Plus size={12} /> {t("storylines.addChapter")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {storylines.length === 0 && (
        <p className="text-center text-[15px] text-ink-3 py-6">{t("storylines.empty")}</p>
      )}
    </div>
  );
}
