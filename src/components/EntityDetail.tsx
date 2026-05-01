"use client";

import { EntityGroupData, resolveGroup, CustomFields, Note, getFieldsForType } from "@/lib/types";
import { TypePill } from "./TypePill";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  StickyNote, ArrowRight, X, Languages, Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { safeJsonParse } from "@/lib/safeJson";
import Image from "next/image";

interface EntityDetailProps {
  entity: {
    id: string;
    name: string;
    type: string;
    description?: string | null;
    date?: string | null;
    customFields: string;
    notes: string;
    imageUrl?: string | null;
    sourceRelations?: { id: string; label: string; target: { id: string; name: string; type: string } }[];
    targetRelations?: { id: string; label: string; source: { id: string; name: string; type: string } }[];
  };
  groups?: EntityGroupData[];
  onAddRelation?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (entityId: string) => void;
  onUpdateNotes?: (notes: string) => void;
}

export function EntityDetail({ entity, groups = [], onAddRelation, onEdit, onDelete, onNavigate, onUpdateNotes }: EntityDetailProps) {
  const [openNotes, setOpenNotes] = useState<number[]>([]);
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  useModalBehavior(showFullImage, () => setShowFullImage(false));
  const [translation, setTranslation] = useState<{ lang: string; name: string; description: string; fields: Record<string, string> } | null>(null);
  const [translating, setTranslating] = useState(false);
  const { t } = useLocale();

  const cf: CustomFields = safeJsonParse(entity.customFields, {});
  const parsedNotes = safeJsonParse(entity.notes, []);
  const notes: Note[] = Array.isArray(parsedNotes) ? parsedNotes : [];
  const group = resolveGroup(entity.type, groups);
  const fields = getFieldsForType(entity.type, groups);

  const allRelations = [
    ...(entity.sourceRelations || []).map(r => ({ id: r.id, label: r.label, name: r.target.name, type: r.target.type, entityId: r.target.id, direction: "out" as const })),
    ...(entity.targetRelations || []).map(r => ({ id: r.id, label: r.label, name: r.source.name, type: r.source.type, entityId: r.source.id, direction: "in" as const })),
  ];

  const toggleNote = (i: number) => {
    setOpenNotes(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    const updated = [...notes, { title: newNoteTitle.trim() || t("common.note"), content: newNoteContent.trim() }];
    onUpdateNotes?.(JSON.stringify(updated));
    setNewNoteTitle("");
    setNewNoteContent("");
    setAddingNote(false);
    setOpenNotes(prev => [...prev, updated.length - 1]);
  };

  useEffect(() => {
    if (addingNote && noteInputRef.current) noteInputRef.current.focus();
  }, [addingNote]);

  // Reset state when entity changes
  useEffect(() => {
    setOpenNotes([]);
    setAddingNote(false);
    setTranslation(null);
  }, [entity.id]);

  const handleTranslate = async (targetLang: string) => {
    if (translating) return;
    // Toggle: if already showing this lang, go back to original
    if (translation?.lang === targetLang) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLang,
          name: entity.name,
          description: entity.description || "",
          fields: cf,
          fieldNames: fields,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTranslation({ lang: targetLang, name: data.name, description: data.description, fields: data.fields });
      }
    } catch {
      setTranslation(null);
    } finally {
      setTranslating(false);
    }
  };

  // Display values: use translation if available, otherwise original
  const displayName = translation?.name || entity.name;
  const displayDescription = translation?.description || entity.description;
  const displayCf: CustomFields = translation ? { ...cf, ...translation.fields } : cf;

  return (
    <div className="flex flex-col min-h-0">
      {/* Header with image */}
      <div className="relative">
        {entity.imageUrl ? (
          <div className="h-32 overflow-hidden cursor-pointer relative group" onClick={() => setShowFullImage(true)}>
            <Image src={entity.imageUrl} alt={entity.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            <div className="absolute bottom-2 right-2 bg-ink/50 text-white text-[15px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {t("common.open")}
            </div>
          </div>
        ) : (
          <div className="h-4" style={{ backgroundColor: group.color + "15" }} />
        )}
      </div>

      {/* Title area */}
      <div className="px-4 sm:px-5 pt-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <TypePill type={entity.type} groups={groups} />
            <h2 className="font-serif text-[24px] sm:text-[28px] font-light leading-tight mt-1.5 text-ink truncate">{displayName}</h2>
            {entity.date && (
              <p className="text-[13px] sm:text-[15px] tracking-[0.2em] uppercase text-ink-3 mt-1">{entity.date}</p>
            )}
          </div>
          <div className="flex gap-0.5 ml-2 flex-shrink-0">
            <button onClick={() => handleTranslate(translation?.lang === "en" ? "ru" : "en")} disabled={translating} aria-label={translation ? (translation.lang === "en" ? t("entity.translateToRu") : t("entity.translateToEn")) : t("entity.translate")} className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-accent transition-colors disabled:opacity-50" title={translation ? (translation.lang === "en" ? t("entity.translateToRu") : t("entity.translateToEn")) : t("entity.translate")}>
              {translating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
            </button>
            {onEdit && (
              <button onClick={onEdit} aria-label={t("common.edit")} className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-accent transition-colors" title={t("common.edit")}>
                <Pencil size={14} />
              </button>
            )}
            {onAddRelation && (
              <button onClick={onAddRelation} aria-label={t("entity.addRelation")} className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-accent transition-colors" title={t("entity.addRelation")}>
                <Plus size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} aria-label={t("common.delete")} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-3 hover:text-red-500 transition-colors" title={t("common.delete")}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-5">
        {/* Description */}
        {displayDescription && (
          <p className="text-ink-2 text-[16px] sm:text-[18px] leading-relaxed mt-3">{displayDescription}</p>
        )}

        {/* Custom fields — key-value pairs */}
        {fields.length > 0 && (
          <div className="mt-4">
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("entity.characteristics")}</span>
            <div className="space-y-1.5">
              {fields.map(field => {
                const key = field.toLowerCase();
                const val = displayCf[key] || displayCf[field];
                if (!val) return null;
                return (
                  <div key={field} className="flex items-baseline gap-2">
                    <span className="text-[14px] sm:text-[16px] text-ink-3 w-20 sm:w-24 flex-shrink-0">{field}</span>
                    <span className="text-[16px] sm:text-[18px] text-ink">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Relations — clickable chips */}
        {allRelations.length > 0 && (
          <div className="mt-4">
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("entity.relations")}</span>
            <div className="space-y-1">
              {allRelations.map(r => (
                <button
                  key={r.id}
                  onClick={() => onNavigate?.(r.entityId)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-ink-3/5 transition-colors text-left group"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveGroup(r.type, groups).color }} />
                  <span className="text-[17px] text-ink-3 flex-shrink-0">
                    {r.direction === "out" ? <ArrowRight size={10} className="inline" /> : <ArrowRight size={10} className="inline rotate-180" />}
                  </span>
                  <span className="text-[16px] text-ink-3">{r.label}</span>
                  <span className="text-[18px] text-ink group-hover:text-accent transition-colors">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes — always visible, inline add */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 flex items-center gap-1">
              <StickyNote size={9} /> {t("common.notes")}
            </span>
            <button
              onClick={() => setAddingNote(true)}
              className="text-[16px] text-accent hover:underline"
            >
              {t("common.addNote")}
            </button>
          </div>

          {notes.length === 0 && !addingNote && (
            <p className="text-[17px] text-ink-3 italic">{t("common.noNotes")}</p>
          )}

          {notes.map((note, i) => (
            <div key={i} className="mb-1.5">
              <button
                onClick={() => toggleNote(i)}
                className="flex items-center gap-1 text-[17px] text-ink-2 hover:text-ink w-full text-left py-0.5"
              >
                {openNotes.includes(i) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="font-medium text-ink">{note.title}</span>
              </button>
              {openNotes.includes(i) && (
                <p className="text-[17px] text-ink-2 pl-4 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              )}
            </div>
          ))}

          {/* Inline note add */}
          {addingNote && (
            <div className="mt-2 bg-background rounded-lg border border-ink-3/15 p-3 space-y-2">
              <input
                id="new-note-title"
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                placeholder={t("common.noteTitle")}
                aria-label={t("common.noteTitle")}
                className="w-full bg-transparent text-[18px] text-ink placeholder:text-ink-3 focus:outline-none"
              />
              <textarea
                id="new-note-content"
                ref={noteInputRef}
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder={t("common.noteText")}
                aria-label={t("common.noteText")}
                rows={3}
                className="w-full bg-transparent text-[17px] text-ink-2 placeholder:text-ink-3 resize-none focus:outline-none"
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote();
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNote}
                  className="text-[16px] bg-accent text-white rounded-md px-3 py-1 hover:bg-accent/90"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => { setAddingNote(false); setNewNoteTitle(""); setNewNoteContent(""); }}
                  className="text-[16px] text-ink-3 hover:text-ink"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Translation indicator */}
      {translation && (
        <div className="px-5 py-1.5 bg-accent-light/20 border-t border-ink-3/5 flex items-center justify-between">
          <span className="text-[16px] text-ink-3">
            {translation.lang === "en" ? t("entity.translationEn") : t("entity.translationRu")}
          </span>
          <button onClick={() => setTranslation(null)} className="text-[16px] text-accent hover:underline">
            {t("common.original")}
          </button>
        </div>
      )}

      {/* Full image viewer */}
      {showFullImage && entity.imageUrl && (
        <div
          className="fixed inset-0 bg-ink/80 dark:bg-white/20 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
          role="dialog"
          aria-modal="true"
          aria-label={entity.name}
        >
          <button
            onClick={() => setShowFullImage(false)}
            aria-label={t("common.close")}
            className="absolute top-4 right-4 p-2 rounded-full bg-ink/50 text-white hover:bg-ink/70 transition-colors"
          >
            <X size={20} />
          </button>
          <Image
            src={entity.imageUrl!}
            alt={entity.name}
            width={800}
            height={800}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
