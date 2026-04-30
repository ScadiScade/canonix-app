"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { EntityType } from "@/lib/types";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface RelationFormProps {
  entities: { id: string; name: string; type: EntityType }[];
  universeId: string;
  sourceId?: string;
  onSubmit: (data: { sourceId: string; targetId: string; label: string; universeId: string }) => void;
  onCancel: () => void;
}

export function RelationForm({ entities, universeId, sourceId, onSubmit, onCancel }: RelationFormProps) {
  const { t } = useLocale();
  useModalBehavior(true, onCancel);
  const [sid, setSid] = useState(sourceId || "");
  const [tid, setTid] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sid || !tid || !label || submitting) return;
    setSubmitting(true);
    await onSubmit({ sourceId: sid, targetId: tid, label, universeId });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-ink/30 dark:bg-white/20 z-50 flex items-center justify-center" onClick={onCancel} role="dialog" aria-modal="true" aria-label={t("relation.title")}>
      <div className="bg-surface rounded-lg border border-ink-3/20 w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()} style={{ animation: "scaleIn 0.15s ease-out" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-[20px] font-light">{t("relation.title")}</h3>
          <button onClick={onCancel} aria-label={t("common.close")} className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("relation.source")}</label>
            <select value={sid} onChange={e => setSid(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent">
              <option value="">{t("relation.selectPlaceholder")}</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("relation.target")}</label>
            <select value={tid} onChange={e => setTid(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent">
              <option value="">{t("relation.selectPlaceholder")}</option>
              {entities.filter(e => e.id !== sid).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("relation.label")}</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent" placeholder={t("relation.labelPlaceholder")} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60">{submitting ? t("common.loading") : t("common.create")}</button>
            <button type="button" onClick={onCancel} className="bg-background text-ink-2 rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors">{t("common.cancel")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
