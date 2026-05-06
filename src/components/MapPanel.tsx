"use client";

import { useState } from "react";
import { Map, Plus, Sparkles, Trash2, Edit3, FileImage } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface MapData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MapPanelProps {
  universeId: string;
  maps: MapData[];
  onRefresh: () => void;
  toast: (msg: string, type?: "info" | "error") => void;
}

export function MapPanel({ universeId, maps, onRefresh, toast }: MapPanelProps) {
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        description: newDesc,
        universeId,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setCreating(false);
      onRefresh();
      toast(t("map.created"));
    } else {
      toast(t("common.error"), "error");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/maps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId }),
      });
      if (res.ok) {
        onRefresh();
        toast(t("map.generated"));
      } else {
        toast(t("common.error"), "error");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("map.confirmDelete"))) return;
    const res = await fetch(`/api/maps?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      onRefresh();
      toast(t("map.deleted"), "info");
    } else {
      toast(t("common.error"), "error");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] tracking-[0.1em] uppercase bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          <Plus size={13} />
          {t("map.new")}
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] tracking-[0.1em] uppercase bg-surface border border-ink-3/15 text-ink hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
        >
          <Sparkles size={13} />
          {generating ? t("common.loading") : t("map.generate")}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-surface border border-ink-3/10 rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-1">{t("common.name")}</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[16px] text-ink focus:outline-none focus:border-accent"
                placeholder={t("map.namePlaceholder")}
              />
            </div>
            <div>
              <label className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-1">{t("common.description")}</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[16px] text-ink focus:outline-none focus:border-accent resize-none"
                placeholder={t("map.descPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-[14px] hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {t("common.create")}
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
                className="px-4 py-1.5 rounded-lg text-[14px] text-ink-2 hover:bg-ink-3/5 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maps list */}
      {maps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-ink-3">
          <Map size={40} className="mb-3 opacity-40" />
          <p className="text-[16px] mb-1">{t("map.emptyTitle")}</p>
          <p className="text-[14px] opacity-60 max-w-xs text-center">{t("map.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {maps.map(m => (
            <div
              key={m.id}
              className="bg-surface border border-ink-3/10 rounded-xl overflow-hidden hover:border-ink-3/20 transition-colors group"
            >
              <div className="aspect-video bg-ink-3/5 flex items-center justify-center relative">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <FileImage size={24} className="text-ink-3/30" />
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => { /* edit placeholder */ }}
                    className="p-1.5 rounded-md bg-surface/90 text-ink-3 hover:text-accent shadow-sm"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-md bg-surface/90 text-ink-3 hover:text-red-500 shadow-sm"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-[16px] text-ink truncate">{m.name}</h3>
                {m.description && (
                  <p className="text-[14px] text-ink-3 mt-0.5 line-clamp-2">{m.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
