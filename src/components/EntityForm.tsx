"use client";

import { EntityType, CustomFields, Note, EntityGroupData, resolveGroup } from "@/lib/types";
import { TypePill } from "./TypePill";
import { X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { safeJsonParse } from "@/lib/safeJson";

interface EntityFormProps {
  type: EntityType;
  universeId: string;
  groups?: EntityGroupData[];
  initial?: {
    id?: string;
    name?: string;
    description?: string;
    date?: string;
    customFields?: string;
    notes?: string;
  };
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function EntityForm({ type, universeId, groups = [], initial, onSubmit, onCancel }: EntityFormProps) {
  const groupInfo = resolveGroup(type, groups);
  const fields = groupInfo.fields;
  const initCf: CustomFields = safeJsonParse(initial?.customFields, {});
  const initNotesRaw = safeJsonParse(initial?.notes, []);
  const initNotes: Note[] = Array.isArray(initNotesRaw) ? initNotesRaw : [];

  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial?.date || "");
  const [cf, setCf] = useState<CustomFields>(initCf);
  const [notes, setNotes] = useState<Note[]>(initNotes);
  const [openNotes, setOpenNotes] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const updateCf = (key: string, value: string) => setCf(prev => ({ ...prev, [key]: value }));
  const { t } = useLocale();
  const addNote = () => setNotes(prev => [...prev, { title: t("entityForm.newNote"), content: "" }]);
  const updateNote = (i: number, field: "title" | "content", value: string) => {
    setNotes(prev => prev.map((n, idx) => idx === i ? { ...n, [field]: value } : n));
  };
  const removeNote = (i: number) => setNotes(prev => prev.filter((_, idx) => idx !== i));
  const toggleNote = (i: number) => setOpenNotes(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await onSubmit({
      id: initial?.id,
      name,
      type,
      universeId,
      description: description || null,
      date: date || null,
      customFields: cf,
      notes,
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
      <div className="p-[18px_20px] border-b border-ink-3/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <TypePill type={type} size="md" />
          <span className="font-serif text-[18px] font-light text-ink-2">
            {initial?.id ? t("entityForm.editEntity") : t("entityForm.newEntity")}
          </span>
        </div>
        <button type="button" onClick={onCancel} aria-label={t("common.close")} className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-[18px_20px] space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="entity-name" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.name")}</label>
          <input
            id="entity-name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
            placeholder={t("entityForm.namePlaceholder")}
            required
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="entity-date" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.date")}</label>
          <input
            id="entity-date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
            placeholder={t("entityForm.datePlaceholder")}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="entity-desc" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.description")}</label>
          <textarea
            id="entity-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent resize-none"
            placeholder={t("entityForm.descriptionPlaceholder")}
          />
        </div>

        {/* Custom fields */}
        {fields.length > 0 && (
          <div>
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("common.fields")}</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {fields.map(field => {
                const key = field.toLowerCase();
                return (
                  <div key={field}>
                    <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-0.5">{field}</label>
                    <input
                      value={cf[key] || cf[field] || ""}
                      onChange={e => updateCf(key, e.target.value)}
                      className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[18px] text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">{t("common.notes")}</span>
            <button type="button" onClick={addNote} className="text-[16px] text-accent hover:underline flex items-center gap-0.5">
              <Plus size={10} /> {t("common.addNote")}
            </button>
          </div>
          {notes.map((note, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => toggleNote(i)} aria-label={openNotes.includes(i) ? t("common.close") : t("common.open")} className="text-ink-3">
                  {openNotes.includes(i) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <input
                  value={note.title}
                  onChange={e => updateNote(i, "title", e.target.value)}
                  className="flex-1 bg-transparent text-[17px] text-ink-2 focus:outline-none border-b border-transparent focus:border-ink-3/30"
                />
                <button type="button" onClick={() => removeNote(i)} aria-label={t("common.delete")} className="text-ink-3 hover:text-red-500">
                  <X size={10} />
                </button>
              </div>
              {openNotes.includes(i) && (
                <textarea
                  value={note.content}
                  onChange={e => updateNote(i, "content", e.target.value)}
                  rows={2}
                  className="w-full mt-1 ml-4 bg-background border border-ink-3/20 rounded-md px-3 py-1.5 text-[17px] text-ink-2 focus:outline-none focus:border-accent resize-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex gap-2 border-t border-ink-3/10 p-[18px_20px] flex-shrink-0">
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {submitting ? t("common.loading") : initial?.id ? t("common.save") : t("common.create")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-background text-ink-2 rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}
