"use client";

import { EntityGroupData, resolveGroup, CustomFields, Note, getFieldsForType } from "@/lib/types";
import { TypePill } from "./TypePill";
import { ChevronDown, ChevronRight, Plus, Trash2, Link2 } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { safeJsonParse } from "@/lib/safeJson";
import Image from "next/image";

interface EntityCardProps {
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
  onClick?: () => void;
  onAddRelation?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function EntityCard({ entity, groups = [], onClick, onAddRelation, onDelete, compact }: EntityCardProps) {
  const { t } = useLocale();
  const [openNotes, setOpenNotes] = useState<number[]>([]);
  const cf: CustomFields = safeJsonParse(entity.customFields, {});
  const parsedNotes = safeJsonParse(entity.notes, []);
  const notes: Note[] = Array.isArray(parsedNotes) ? parsedNotes : [];
  const fields = getFieldsForType(entity.type, groups);

  const allRelations = [
    ...(entity.sourceRelations || []).map(r => ({ id: r.id, label: r.label, name: r.target.name, type: r.target.type, entityId: r.target.id })),
    ...(entity.targetRelations || []).map(r => ({ id: r.id, label: r.label, name: r.source.name, type: r.source.type, entityId: r.source.id })),
  ];

  const toggleNote = (i: number) => {
    setOpenNotes(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-surface rounded-lg cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-ink-3/20 overflow-hidden"
      >
        {entity.imageUrl ? (
          <div className="h-20 sm:h-24 overflow-hidden relative">
            <Image src={entity.imageUrl} alt={entity.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-[10px_14px]">
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-[16px] sm:text-[22px] font-light leading-tight text-white drop-shadow truncate">{entity.name}</h3>
                <TypePill type={entity.type} groups={groups} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-[18px_20px]">
            <div className="flex items-start justify-between gap-1 mb-0.5 sm:mb-1">
              <h3 className="font-serif text-[18px] sm:text-[24px] font-light leading-tight truncate">{entity.name}</h3>
              <TypePill type={entity.type} groups={groups} />
            </div>
            {entity.date && (
              <p className="text-[12px] sm:text-[15px] tracking-[0.2em] uppercase text-ink-3 mb-0.5 sm:mb-1">{entity.date}</p>
            )}
            {entity.description && (
              <p className="text-ink-2 text-[14px] sm:text-[17px] line-clamp-2">{entity.description}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-ink-3/15 overflow-hidden">
      {/* Header */}
      <div className="p-[18px_20px] border-b border-ink-3/10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <TypePill type={entity.type} groups={groups} />
            <h2 className="font-serif text-[24px] font-light mt-2 leading-tight">{entity.name}</h2>
            {entity.date && (
              <p className="text-[15px] tracking-[0.2em] uppercase text-ink-3 mt-1">{entity.date}</p>
            )}
          </div>
          <div className="flex gap-1">
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
        {entity.description && (
          <p className="text-ink-2 text-[17px] leading-relaxed">{entity.description}</p>
        )}
      </div>

      {/* Custom fields */}
      {fields.length > 0 && (
        <div className="p-[18px_20px] border-b border-ink-3/10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {fields.map(field => {
              const key = field.toLowerCase();
              const val = cf[key] || cf[field];
              if (!val) return null;
              return (
                <div key={field}>
                  <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block">{field}</span>
                  <span className="text-[17px] text-ink">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Relations */}
      {allRelations.length > 0 && (
        <div className="p-[18px_20px] border-b border-ink-3/10">
          <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("entity.relations")}</span>
          <div className="flex flex-wrap gap-1.5">
            {allRelations.map(r => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 text-[16px] bg-background rounded-sm px-2 py-1 text-ink-2"
              >
                <Link2 size={10} style={{ color: resolveGroup(r.type, groups).color }} />
                <span className="text-ink-3">{r.label}</span>
                <span className="text-ink">{r.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible notes */}
      {notes.length > 0 && (
        <div className="p-[18px_20px]">
          <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("common.notes")}</span>
          {notes.map((note, i) => (
            <div key={i} className="mb-1">
              <button
                onClick={() => toggleNote(i)}
                className="flex items-center gap-1 text-[17px] text-ink-2 hover:text-ink w-full text-left py-0.5"
              >
                {openNotes.includes(i) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {note.title}
              </button>
              {openNotes.includes(i) && (
                <p className="text-[17px] text-ink-2 pl-4 leading-relaxed">{note.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
