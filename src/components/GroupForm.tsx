"use client";

import { useState } from "react";
import { X, Plus, Trash2, Palette } from "lucide-react";
import { EntityGroupData } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { useToast } from "@/components/Toast";

const PRESET_COLORS = [
  "#2D5BE3", "#16A34A", "#D97706", "#9333EA",
  "#DC2626", "#0891B2", "#C026D3", "#65A30D",
  "#EA580C", "#4F46E5", "#78716C", "#0D9488",
];

const PRESET_ICONS = [
  "User", "Globe", "Zap", "Building2", "Sword", "Car",
  "Dna", "Ship", "Rocket", "Crown", "Shield", "Skull",
  "Tag", "Star", "Heart", "Flame",
];

interface GroupFormProps {
  universeId: string;
  groups: EntityGroupData[];
  onCreated: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

export function GroupForm({ universeId, groups, onCreated, onUpdated, onDeleted, onClose }: GroupFormProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  useModalBehavior(true, onClose);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#78716C");
  const [icon, setIcon] = useState("Tag");
  const [fields, setFields] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newField, setNewField] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").slice(0, 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || submitting) return;
    setSubmitting(true);

    if (editingId) {
      const res = await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name, slug: slug || autoSlug(name), color, icon, fields }),
      });
      if (res.ok) { setEditingId(null); setName(""); setSlug(""); setFields([]); onUpdated(); toast(t("universe.groupUpdated")); }
      else toast(t("common.error"), "error");
    } else {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, name, slug: slug || autoSlug(name), color, icon, fields }),
      });
      if (res.ok) { setName(""); setSlug(""); setFields([]); onCreated(); toast(t("universe.groupCreated")); }
      else toast(t("common.error"), "error");
    }
    setSubmitting(false);
  };

  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteGroupTarget(id);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    const res = await fetch("/api/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteGroupTarget }),
    });
    setDeleteGroupTarget(null);
    if (res.ok) { onDeleted(); toast(t("universe.groupDeleted"), "info"); }
    else toast(t("common.error"), "error");
  };

  const startEdit = (g: EntityGroupData) => {
    setEditingId(g.id);
    setName(g.name);
    setSlug(g.slug);
    setColor(g.color);
    setIcon(g.icon);
    setFields(g.fields);
    setNewField("");
  };

  return (
    <div className="fixed inset-0 bg-ink/30 dark:bg-white/20 z-50 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("group.title")}>
      <div className="bg-surface rounded-lg border border-ink-3/20 w-full max-w-md max-h-[85vh] flex flex-col min-h-0 overflow-hidden p-6 shadow-xl" onClick={e => e.stopPropagation()} style={{ animation: "scaleIn 0.15s ease-out" }}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="font-serif text-[20px] font-light">{t("group.title")}</h3>
          <button onClick={onClose} aria-label={t("common.close")} className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
        {/* Existing groups */}
        <div className="space-y-2 mb-5">
          {groups.map(g => (
            <div
              key={g.id || g.slug}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                editingId === g.id ? "border-accent/40 bg-accent/5" : "border-ink-3/10 hover:border-ink-3/20"
              }`}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[18px] text-ink font-medium truncate">{g.name}</div>
                <div className="text-[15px] text-ink-3 tracking-[0.1em] uppercase">{g.slug} · {g.fields.length} {t("group.fieldsCount")}</div>
              </div>
              <button onClick={() => startEdit(g)} className="text-[15px] text-accent hover:underline">{t("group.change")}</button>
              <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-3 hover:text-red-500 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Create / Edit form */}
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-ink-3/10 pt-4">
          <div className="text-[15px] tracking-[0.2em] uppercase text-ink-3 mb-1">
            {editingId ? t("group.editGroup") : t("group.newGroup")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[15px] tracking-[0.15em] uppercase text-ink-3 block mb-1">{t("group.name")}</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
                placeholder={t("groupForm.namePlaceholder")}
              />
            </div>
            <div>
              <label className="text-[15px] tracking-[0.15em] uppercase text-ink-3 block mb-1">{t("group.slug")}</label>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
                placeholder="transport"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-[15px] tracking-[0.15em] uppercase text-ink-3 block mb-1.5">{t("group.color")}</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-md border-2 transition-transform ${color === c ? "scale-125 border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <div className="relative">
                <Palette size={16} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-8 h-6 rounded-md border border-ink-3/20 cursor-pointer opacity-0 absolute inset-0"
                />
                <div className="w-8 h-6 rounded-md border border-ink-3/20 flex items-center justify-center" style={{ backgroundColor: color }}>
                  <Palette size={12} className="text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-[15px] tracking-[0.15em] uppercase text-ink-3 block mb-1.5">{t("group.icon")}</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`px-2 py-1 rounded-md text-[15px] tracking-[0.1em] uppercase transition-colors ${
                    icon === ic ? "bg-accent text-white" : "bg-background text-ink-2 hover:text-ink border border-ink-3/10"
                  }`}
                  aria-label={ic}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="text-[15px] tracking-[0.15em] uppercase text-ink-3 block mb-1">{t("common.fields")}</label>
            <div className="space-y-1.5">
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={f}
                    onChange={e => { const next = [...fields]; next[i] = e.target.value; setFields(next); }}
                    className="flex-1 bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
                    placeholder={t("group.fieldPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((_, j) => j !== i))}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-3 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  value={newField}
                  onChange={e => setNewField(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newField.trim()) { e.preventDefault(); setFields([...fields, newField.trim()]); setNewField(""); }
                  }}
                  className="flex-1 bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
                  placeholder={t("group.fieldPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => { if (newField.trim()) { setFields([...fields, newField.trim()]); setNewField(""); } }}
                  className="p-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors flex items-center gap-1.5 disabled:opacity-60">
              <Plus size={12} />
              {submitting ? t("common.loading") : editingId ? t("common.save") : t("common.create")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setName(""); setSlug(""); setFields([]); setColor("#78716C"); setIcon("Tag"); }}
                className="bg-background text-ink-2 rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteGroupTarget}
        title={t("group.deleteGroup")}
        message={t("group.deleteGroupMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />
    </div>
  );
}
