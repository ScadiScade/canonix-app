"use client";

import { useState } from "react";
import { TimelineScaleData, TimelineEra } from "@/lib/types";
import { useLocale } from "@/lib/i18n";
import { X, Plus, Trash2, Settings } from "lucide-react";

interface TimelineScaleFormProps {
  universeId: string;
  scales: TimelineScaleData[];
  onCreated: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

const EMPTY_ERA: TimelineEra & { offsetStr: string } = {
  name: "",
  abbreviation: "",
  direction: "backward",
  offset: 0,
  offsetStr: "0",
};

export function TimelineScaleForm({ universeId, scales, onCreated, onUpdated, onDeleted, onClose }: TimelineScaleFormProps) {
  const { t } = useLocale();
  const [editing, setEditing] = useState<TimelineScaleData | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [eras, setEras] = useState<Array<TimelineEra & { offsetStr: string }>>([{ ...EMPTY_ERA }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setName("");
    setSlug("");
    setIsDefault(false);
    setEras([{ ...EMPTY_ERA }]);
    setError(null);
  };

  const startEdit = (scale: TimelineScaleData) => {
    setCreating(false);
    setEditing(scale);
    setName(scale.name);
    setSlug(scale.slug);
    setIsDefault(scale.isDefault);
    setEras(scale.eras.map(e => ({ ...e, offsetStr: String(e.offset) })));
    setError(null);
  };

  const updateEra = (idx: number, field: string, value: string) => {
    setEras(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const addEra = () => {
    setEras(prev => [...prev, { ...EMPTY_ERA }]);
  };

  const removeEra = (idx: number) => {
    setEras(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const parsedEras = eras.map(e => ({
      name: e.name,
      abbreviation: e.abbreviation,
      direction: e.direction as "forward" | "backward",
      offset: parseInt(e.offsetStr) || 0,
    }));

    try {
      if (creating) {
        const res = await fetch("/api/timeline-scales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug, universeId, eras: parsedEras, isDefault }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("common.error"));
        } else {
          onCreated();
          setCreating(false);
        }
      } else if (editing) {
        const res = await fetch("/api/timeline-scales", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, name, slug, eras: parsedEras, isDefault }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("common.error"));
        } else {
          onUpdated();
          setEditing(null);
        }
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.delete") + "?")) return;
    try {
      const res = await fetch(`/api/timeline-scales?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted();
        setEditing(null);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-ink-3/15 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-3/10">
          <span className="text-[17px] font-medium text-ink">{t("timeline.manageScales")}</span>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing scales */}
          {scales.map(s => (
            <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
              editing?.id === s.id ? "border-accent bg-accent/5" : "border-ink-3/10 hover:border-ink-3/20"
            }`}>
              <div className="flex items-center gap-2" onClick={() => startEdit(s)}>
                <Settings size={14} className="text-ink-3" />
                <span className="text-[15px] text-ink">{s.name}</span>
                <span className="text-[13px] text-ink-3">({s.eras.map(e => e.abbreviation).join(", ")})</span>
                {s.isDefault && <span className="text-[11px] bg-accent/10 text-accent px-1.5 rounded">{t("timeline.setDefault")}</span>}
              </div>
              <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-ink-3 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}

          {/* Create / Edit form */}
          {(creating || editing) && (
            <div className="border border-ink-3/10 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] text-ink-3 block mb-1">{t("timeline.scaleName")}</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-ink-3/15 text-[15px] bg-background" />
                </div>
                <div>
                  <label className="text-[13px] text-ink-3 block mb-1">{t("timeline.scaleSlug")}</label>
                  <input value={slug} onChange={e => setSlug(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-ink-3/15 text-[15px] bg-background" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[14px] text-ink-2 cursor-pointer">
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="accent-accent" />
                {t("timeline.setDefault")}
              </label>

              {/* Eras */}
              <div className="space-y-2">
                <span className="text-[14px] text-ink-3 font-medium">Эры:</span>
                {eras.map((era, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2">
                      <input value={era.name} onChange={e => updateEra(idx, "name", e.target.value)} placeholder={t("timeline.eraName")} className="w-full px-2 py-1 rounded border border-ink-3/15 text-[14px] bg-background" />
                    </div>
                    <div>
                      <input value={era.abbreviation} onChange={e => updateEra(idx, "abbreviation", e.target.value)} placeholder={t("timeline.eraAbbr")} className="w-full px-2 py-1 rounded border border-ink-3/15 text-[14px] bg-background" />
                    </div>
                    <div>
                      <select value={era.direction} onChange={e => updateEra(idx, "direction", e.target.value)} className="w-full px-2 py-1 rounded border border-ink-3/15 text-[14px] bg-background">
                        <option value="backward">{t("timeline.eraBackward")}</option>
                        <option value="forward">{t("timeline.eraForward")}</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <input value={era.offsetStr} onChange={e => updateEra(idx, "offsetStr", e.target.value)} placeholder={t("timeline.eraOffset")} className="w-full px-2 py-1 rounded border border-ink-3/15 text-[14px] bg-background" />
                      <button onClick={() => removeEra(idx)} className="p-1 text-ink-3 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={addEra} className="flex items-center gap-1 text-[13px] text-accent hover:underline"><Plus size={12} />{t("timeline.addEra")}</button>
              </div>

              {error && <div className="text-red-500 text-[14px]">{error}</div>}

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving || !name || !slug || eras.length === 0} className="px-4 py-1.5 bg-accent text-white rounded-md text-[14px] hover:bg-accent/90 disabled:opacity-50">
                  {saving ? "..." : t("common.save")}
                </button>
                <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-1.5 text-ink-3 rounded-md text-[14px] hover:text-ink">
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}

          {!creating && !editing && (
            <button onClick={startCreate} className="flex items-center gap-1.5 text-[14px] text-accent hover:underline">
              <Plus size={14} />{t("timeline.addScale")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
