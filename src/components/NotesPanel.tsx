"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Edit3, FileText, Link2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface NoteData {
  id: string;
  title: string;
  content: string;
  entityId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface NotesPanelProps {
  universeId: string;
  notes: NoteData[];
  entities: { id: string; name: string; type: string }[];
  onRefresh: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

export function NotesPanel({ universeId, notes, entities, onRefresh, toast }: NotesPanelProps) {
  const { t } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        content: newContent,
        universeId,
        sortOrder: notes.length,
      }),
    });
    if (res.ok) {
      setNewTitle("");
      setNewContent("");
      setCreating(false);
      onRefresh();
      toast(t("notes.created"));
    } else {
      toast(t("common.error"), "error");
    }
  }, [newTitle, newContent, universeId, notes.length, onRefresh, toast, t]);

  const handleUpdate = useCallback(async (id: string) => {
    const res = await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitle.trim(), content: editContent }),
    });
    if (res.ok) {
      setEditingId(null);
      onRefresh();
      toast(t("notes.updated"));
    } else {
      toast(t("common.error"), "error");
    }
  }, [editTitle, editContent, onRefresh, toast, t]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      onRefresh();
      toast(t("notes.deleted"), "info");
    } else {
      toast(t("common.error"), "error");
    }
  }, [onRefresh, toast, t]);

  const startEdit = (note: NoteData) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const entityMap = new Map(entities.map(e => [e.id, e.name]));

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Create button / form */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] tracking-[0.1em] uppercase text-ink-2 border border-dashed border-ink-3/20 hover:border-ink-3/40 hover:text-ink transition-colors"
        >
          <Plus size={12} />
          {t("notes.new")}
        </button>
      ) : (
        <div className="bg-surface border border-ink-3/15 rounded-xl p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder={t("notes.titlePlaceholder")}
            className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[17px] text-ink focus:outline-none focus:border-accent"
            autoFocus
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={t("notes.contentPlaceholder")}
            rows={4}
            className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              className="bg-accent text-white rounded-xl px-4 py-1.5 text-[13px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              {t("common.create")}
            </button>
            <button
              onClick={() => { setCreating(false); setNewTitle(""); setNewContent(""); }}
              className="bg-background text-ink-2 rounded-xl px-4 py-1.5 text-[13px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.map(note => (
        <div
          key={note.id}
          className="bg-surface border border-ink-3/15 rounded-xl p-4 group"
        >
          {editingId === note.id ? (
            <div className="space-y-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[17px] text-ink focus:outline-none focus:border-accent"
              />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={4}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(note.id)}
                  className="bg-accent text-white rounded-xl px-4 py-1.5 text-[13px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="bg-background text-ink-2 rounded-xl px-4 py-1.5 text-[13px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-ink-3 flex-shrink-0" />
                  <h3 className="text-[17px] text-ink font-medium truncate">{note.title}</h3>
                  {note.entityId && entityMap.has(note.entityId) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-ink-3 bg-background border border-ink-3/10 whitespace-nowrap">
                      <Link2 size={9} />
                      {entityMap.get(note.entityId)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-accent transition-colors"
                    title={t("common.edit")}
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-ink-3 hover:text-red-500 transition-colors"
                    title={t("common.delete")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {note.content && (
                <div className="mt-2 text-[15px] text-ink-2 whitespace-pre-wrap line-clamp-6">{note.content}</div>
              )}
            </>
          )}
        </div>
      ))}

      {notes.length === 0 && !creating && (
        <div className="text-center py-12 text-ink-3 text-[14px]">
          {t("notes.empty")}
        </div>
      )}
    </div>
  );
}
