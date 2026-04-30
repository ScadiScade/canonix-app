"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sparkles, Wand2, FileText, ChevronDown, X, Loader2, Coins, Image as ImageIcon, Send, Check, Plus, GitBranch, ExternalLink, Pencil, Layers,
} from "lucide-react";
import { EntityGroupData, resolveGroup } from "@/lib/types";
import { safeJsonParse } from "@/lib/safeJson";
import { useCredits } from "@/components/CreditProvider";
import { useLocale } from "@/lib/i18n";

type AiAction = "generate-entities" | "edit-entity" | "generate-groups" | "scenario" | "suggestion" | "expand" | "edit";

interface AiActionOption {
  id: AiAction;
  label: string;
  icon: React.ReactNode;
  cost: number;
  description: string;
}

// AI_ACTIONS moved inside component for i18n access

interface GeneratedEntity {
  name: string;
  type: string;
  description: string;
  date?: string | null;
  customFields?: Record<string, string>;
  sources?: string[];
}

interface GeneratedGroup {
  name: string;
  slug: string;
  color: string;
  icon: string;
  fields: string[];
}

interface GeneratedRelation {
  sourceIndex: number;
  targetIndex: number;
  label: string;
}

interface AiAssistantProps {
  universeId?: string;
  universeContext?: string;
  groups?: EntityGroupData[];
  entities?: { id: string; name: string; type: string; description?: string | null }[];
  onEntitiesCreated?: () => void;
  onEntityEdited?: () => void;
  onGroupsCreated?: () => void;
}

export function AiAssistant({ universeId, universeContext, groups = [], entities = [], onEntitiesCreated, onEntityEdited, onGroupsCreated }: AiAssistantProps) {
  const { t } = useLocale();
  const AI_ACTIONS: AiActionOption[] = [
    { id: "generate-entities", label: t("ai.generateEntities"), icon: <Plus size={14} />, cost: 5, description: t("ai.generateEntitiesDesc") },
    { id: "generate-groups", label: t("ai.generateGroups"), icon: <Layers size={14} />, cost: 5, description: t("ai.generateGroupsDesc") },
    { id: "edit-entity", label: t("ai.editEntity"), icon: <Pencil size={14} />, cost: 3, description: t("ai.editEntityDesc") },
    { id: "scenario", label: t("ai.scenario"), icon: <FileText size={14} />, cost: 3, description: t("ai.scenarioDesc") },
    { id: "suggestion", label: t("ai.suggestion"), icon: <Sparkles size={14} />, cost: 1, description: t("ai.suggestionDesc") },
    { id: "expand", label: t("ai.expand"), icon: <ChevronDown size={14} />, cost: 2, description: t("ai.expandDesc") },
    { id: "edit", label: t("ai.rewrite"), icon: <Wand2 size={14} />, cost: 2, description: t("ai.rewriteDesc") },
  ];
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<AiAction | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const { balance, setBalance } = useCredits();
  const [error, setError] = useState<string | null>(null);
  const [showImageGen, setShowImageGen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");

  // Entity generation state
  const [genEntities, setGenEntities] = useState<GeneratedEntity[]>([]);
  const [genRelations, setGenRelations] = useState<GeneratedRelation[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [entityCount, setEntityCount] = useState<number>(5);

  // Entity edit state
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editUpdates, setEditUpdates] = useState<Record<string, unknown> | null>(null);
  const [editApplying, setEditApplying] = useState(false);

  // Group generation state
  const [genGroups, setGenGroups] = useState<GeneratedGroup[]>([]);
  const [selectedGroupIndices, setSelectedGroupIndices] = useState<Set<number>>(new Set());
  const [confirmingGroups, setConfirmingGroups] = useState(false);

  // Note actions state (scenario, suggestion → save as note on entity)
  const [noteEntityId, setNoteEntityId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Prompt improvement state
  const [improvingPrompt, setImprovingPrompt] = useState(false);

  // Image generation state
  const [imageEntityId, setImageEntityId] = useState<string | null>(null);

  const isNoteAction = action === "scenario" || action === "suggestion";
  const isEntityTextAction = action === "expand" || action === "edit";

  const selectedAction = AI_ACTIONS.find(a => a.id === action);

  const handleGenerate = async () => {
    if (!action || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setGenEntities([]);
    setGenRelations([]);

    try {
      // Build context including target entity for note/text actions
      let context = universeContext || "";
      if (noteEntityId) {
        const targetEntity = entities.find(e => e.id === noteEntityId);
        if (targetEntity) {
          context = `${t("ai.forEntity")} ${targetEntity.name} (${targetEntity.type})\n${targetEntity.description || ""}\n\n${context}`;
        }
      }
      const res = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: action, prompt: prompt.trim(), context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setResult(data.text);
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEntities = async () => {
    if (!universeId) return;
    setLoading(true);
    setError(null);
    setGenEntities([]);
    setGenRelations([]);

    try {
      const res = await fetch("/api/ai/generate-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || undefined, universeId, context: universeContext, targetGroupId, count: entityCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setGenEntities(data.entities || []);
        setGenRelations(data.relations || []);
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setImprovingPrompt(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), context: universeContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setPrompt(data.improved);
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setImprovingPrompt(false);
    }
  };

  const handleConfirmEntities = async () => {
    if (!universeId || genEntities.length === 0) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/confirm-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, entities: genEntities, relations: genRelations, targetGroupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("common.error"));
      } else {
        setGenEntities([]);
        setGenRelations([]);
        setAction(null);
        setPrompt("");
        if (onEntitiesCreated) onEntitiesCreated();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setConfirming(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteEntityId || !result) return;
    setSavingNote(true);
    setError(null);
    try {
      // Fetch current entity notes
      const entityRes = await fetch(`/api/entities?id=${noteEntityId}`);
      if (!entityRes.ok) { setError(t("common.error")); setSavingNote(false); return; }
      const entityData = await entityRes.json();
      const existingNotes: { title: string; content: string }[] = Array.isArray(entityData.notes) ? entityData.notes : safeJsonParse(entityData.notes, []);

      // Append AI result as a new note
      const noteTitle = action === "scenario" ? `📝 ${t("ai.scenario")}` : action === "suggestion" ? `💡 ${t("ai.suggestion")}` : action === "expand" ? `📖 ${t("ai.expand")}` : `✏️ ${t("ai.rewrite")}`;
      const updatedNotes = [...existingNotes, `${noteTitle}\n${result}`];

      const res = await fetch("/api/entities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteEntityId, notes: JSON.stringify(updatedNotes) }),
      });
      if (!res.ok) {
        setError(t("common.error"));
        setSavingNote(false);
        return;
      }

      setResult(null);
      setAction(null);
      setPrompt("");
      setNoteEntityId(null);
      if (onEntityEdited) onEntityEdited();
    } catch {
      setError(t("common.error"));
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditEntity = async () => {
    if (!editEntityId || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setEditUpdates(null);

    try {
      const res = await fetch("/api/ai/edit-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: editEntityId, instruction: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setEditUpdates(data.updates);
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyEdit = async () => {
    if (!editEntityId || !editUpdates) return;
    setEditApplying(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { id: editEntityId };
      if (editUpdates.name !== undefined) body.name = editUpdates.name;
      if (editUpdates.description !== undefined) body.description = editUpdates.description;
      if (editUpdates.date !== undefined) body.date = editUpdates.date;
      if (editUpdates.customFields !== undefined) body.customFields = JSON.stringify(editUpdates.customFields);
      if (editUpdates.notes !== undefined) body.notes = JSON.stringify(editUpdates.notes);

      const res = await fetch("/api/entities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("common.error"));
      } else {
        setEditEntityId(null);
        setEditUpdates(null);
        setAction(null);
        setPrompt("");
        if (onEntityEdited) onEntityEdited();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setEditApplying(false);
    }
  };

  const handleGenerateGroups = async () => {
    if (!prompt.trim() || !universeId) return;
    setLoading(true);
    setError(null);
    setGenGroups([]);

    try {
      // Pass existing groups so AI doesn't duplicate
      const existingGroupsInfo = groups.map(g => ({ name: g.name, slug: g.slug, fields: g.fields }));
      const res = await fetch("/api/ai/generate-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), universeId, existingGroups: existingGroupsInfo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        const generated = data.groups || [];
        setGenGroups(generated);
        // Pre-select all groups by default
        setSelectedGroupIndices(new Set(generated.map((_: GeneratedGroup, i: number) => i)));
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGroups = async () => {
    if (!universeId || selectedGroupIndices.size === 0) return;
    setConfirmingGroups(true);
    setError(null);

    try {
      // Create only selected groups
      const selectedGroups = genGroups.filter((_, i) => selectedGroupIndices.has(i));
      let failed = false;
      for (const g of selectedGroups) {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ universeId, name: g.name, slug: g.slug, color: g.color, icon: g.icon, fields: g.fields }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("common.error"));
          failed = true;
          break;
        }
      }
      if (!failed) {
        setGenGroups([]);
        setSelectedGroupIndices(new Set());
        setAction(null);
        setPrompt("");
        if (onGroupsCreated) onGroupsCreated();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setConfirmingGroups(false);
    }
  };

  const handleImageGenerate = async () => {
    if (!imageEntityId) return;
    setImageLoading(true);
    setError(null);
    setImageResult(null);

    try {
      const targetEntity = entities.find(e => e.id === imageEntityId);
      const context = targetEntity ? `${targetEntity.name} (${targetEntity.type}): ${targetEntity.description || ""}` : "";

      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt.trim() || undefined,
          aspectRatio: "16:9",
          context,
          entityName: targetEntity?.name,
          entityDescription: targetEntity?.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setImageResult(data.imageUrl);
        setBalance(data.balance);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setImageLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!imageEntityId || !imageResult) return;
    setSavingNote(true);
    setError(null);
    try {
      const res = await fetch("/api/entities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageEntityId, imageUrl: imageResult }),
      });
      if (!res.ok) {
        setError(t("common.error"));
      } else {
        setImageResult(null);
        setShowImageGen(false);
        setImageEntityId(null);
        setImagePrompt("");
        if (onEntityEdited) onEntityEdited();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSavingNote(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors z-50"
        title={t("ai.title")}
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] max-h-[85vh] bg-surface border border-ink-3/20 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-3/10">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="font-serif text-[20px] font-light text-ink">{t("ai.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <span className="flex items-center gap-1 text-[17px] text-ink-2">
              <Coins size={10} /> {balance}
            </span>
          )}
          <button onClick={() => {
            setOpen(false);
            setAction(null);
            setPrompt("");
            setResult(null);
            setImageResult(null);
            setError(null);
            setShowImageGen(false);
            setImagePrompt("");
            setGenEntities([]);
            setGenRelations([]);
            setEntityCount(5);
            setEditEntityId(null);
            setEditUpdates(null);
            setGenGroups([]);
            setSelectedGroupIndices(new Set());
            setNoteEntityId(null);
          }} className="text-ink-3 hover:text-ink transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Action selector */}
        {!action && !result && !imageResult && genEntities.length === 0 && !editEntityId && !editUpdates && genGroups.length === 0 && (
          <>
            <p className="text-[18px] text-ink-2 mb-2">{t("ai.selectAction")}</p>
            <div className="grid grid-cols-2 gap-2">
              {AI_ACTIONS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAction(a.id)}
                  disabled={(a.id === "generate-entities" && !universeId) || (a.id === "edit-entity" && entities.length === 0) || (a.id === "generate-groups" && !universeId) || ((a.id === "scenario" || a.id === "suggestion" || a.id === "expand" || a.id === "edit") && entities.length === 0)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-3/10 hover:border-accent/40 hover:bg-accent-light/30 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-accent">{a.icon}</span>
                  <div>
                    <div className="text-[18px] text-ink">{a.label}</div>
                    <div className="text-[15px] text-ink-3">{a.cost} {t("common.credits")}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowImageGen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent-light/20 hover:bg-accent-light/40 transition-colors"
            >
              <ImageIcon size={14} className="text-accent" />
              <div className="text-left">
                <div className="text-[18px] text-ink">{t("ai.imageGenTitle")}</div>
                <div className="text-[15px] text-ink-3">10 {t("common.credits")}</div>
              </div>
            </button>
          </>
        )}

        {/* Image generation */}
        {showImageGen && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowImageGen(false); setImageResult(null); setImageEntityId(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">{t("ai.imageGenTitle")} (10 {t("common.credits")})</span>
            </div>

            {/* Select entity */}
            {!imageEntityId && (
              <div className="space-y-2">
                <span className="text-[16px] text-ink-3 tracking-[0.15em] uppercase">{t("ai.selectEntity")}</span>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {entities.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setImageEntityId(e.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-3/10 hover:border-accent/40 hover:bg-accent-light/20 transition-colors text-left"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveGroup(e.type, groups).color }} />
                      <span className="text-[18px] text-ink flex-1 truncate">{e.name}</span>
                      <span className="text-[15px] tracking-[0.1em] uppercase text-ink-3">{resolveGroup(e.type, groups).name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {imageEntityId && (
              <div className="flex items-center gap-2 text-[17px]">
                <span className="text-ink-3">{t("ai.forEntity")}</span>
                <span className="text-ink font-medium">{entities.find(e => e.id === imageEntityId)?.name}</span>
                <button onClick={() => setImageEntityId(null)} className="text-ink-3 hover:text-ink ml-1">✕</button>
              </div>
            )}

            <textarea
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder={t("ai.imageGenPlaceholder")}
              className="w-full h-16 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink resize-none focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => handleImageGenerate()}
              disabled={imageLoading || !imageEntityId}
              className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {imageLoading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {imagePrompt.trim() ? `${t("ai.generateImage")} (10 ${t("common.credits")})` : `${t("ai.autoImage")} (10 ${t("common.credits")})`}
            </button>
            {imageResult && (
              <div className="space-y-2">
                <Image src={imageResult} alt="AI-generated illustration" width={512} height={512} className="w-full rounded-md border border-ink-3/10" />
                <button
                  onClick={handleSaveImage}
                  disabled={savingNote}
                  className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
                >
                  {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t("ai.saveImage")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Entity generation mode */}
        {action === "generate-entities" && genEntities.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAction(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">{t("ai.entityGenTitle")} ({entityCount} {t("common.credits")})</span>
            </div>
            {groups.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[17px] text-amber-700">
                {t("ai.noGroupsWarning")}
                <button onClick={() => setAction("generate-groups")} className="ml-1 text-accent hover:underline font-medium">
                  {t("ai.generateGroupsLink")}
                </button>
              </div>
            )}
            <p className="text-[17px] text-ink-3">{t("ai.entityGenHint")}</p>
            <div className="flex items-center gap-2">
              <span className="text-[16px] text-ink-3">{t("ai.count")}:</span>
              <div className="flex gap-0.5 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setEntityCount(n)}
                    className={`w-7 h-7 rounded text-[13px] flex items-center justify-center transition-colors ${
                      entityCount === n ? "bg-accent text-white" : "bg-background border border-ink-3/15 text-ink-2 hover:border-accent/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t("ai.entityGenPlaceholder")}
              className="w-full h-20 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink resize-none focus:outline-none focus:border-accent"
            />
            {prompt.trim() && (
              <button
                onClick={handleImprovePrompt}
                disabled={improvingPrompt}
                className="w-full py-1.5 bg-background border border-ink-3/15 text-ink-2 rounded-md text-[17px] flex items-center justify-center gap-1.5 hover:text-ink hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                {improvingPrompt ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {t("ai.improvePrompt")} (0.5 {t("common.credits")})
              </button>
            )}
            {groups.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[16px] text-ink-3">{t("ai.toGroup")}</span>
                <select
                  value={targetGroupId || ""}
                  onChange={e => setTargetGroupId(e.target.value || null)}
                  className="flex-1 bg-background border border-ink-3/20 rounded-md px-2 py-1.5 text-[17px] text-ink focus:outline-none focus:border-accent"
                >
                  <option value="">{t("ai.autoByType")}</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleGenerateEntities}
              disabled={loading}
              className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {prompt.trim() ? `${t("ai.generateCards")} ${entityCount} (${entityCount} ${t("common.credits")})` : `${t("ai.autoGen")} ${entityCount} (${entityCount} ${t("common.credits")})`}
            </button>
          </div>
        )}

        {/* Edit entity: select entity */}
        {action === "edit-entity" && !editEntityId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAction(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">{t("ai.editEntity")} (3 {t("common.credits")})</span>
            </div>
            <p className="text-[17px] text-ink-3">{t("ai.editEntitySelect")}</p>
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {entities.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEditEntityId(e.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-3/10 hover:border-accent/40 hover:bg-accent-light/20 transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveGroup(e.type, groups).color }} />
                  <span className="text-[18px] text-ink flex-1 truncate">{e.name}</span>
                  <span className="text-[15px] tracking-[0.1em] uppercase text-ink-3">{resolveGroup(e.type, groups).name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edit entity: instruction prompt */}
        {action === "edit-entity" && editEntityId && !editUpdates && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditEntityId(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">
                {t("ai.editEntity")}: {entities.find(e => e.id === editEntityId)?.name}
              </span>
            </div>
            <p className="text-[17px] text-ink-3">{t("ai.editInstruction")}</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t("ai.editEntityPlaceholder")}
              className="w-full h-24 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink resize-none focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleEditEntity}
              disabled={loading || !prompt.trim()}
              className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
              {t("ai.editEntity")} (3 {t("common.credits")})
            </button>
          </div>
        )}

        {/* Edit entity: preview + apply */}
        {editUpdates && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[18px] text-ink font-medium">{t("ai.editEntity")}</span>
              <button onClick={() => { setEditUpdates(null); setPrompt(""); }} className="text-ink-3 hover:text-ink text-[17px]">
                {t("common.cancel")}
              </button>
            </div>
            <div className="bg-background rounded-lg border border-ink-3/10 p-3 space-y-1.5">
              {Object.entries(editUpdates).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[16px] tracking-[0.1em] uppercase text-ink-3 flex-shrink-0 pt-0.5">{key}</span>
                  <span className="text-[18px] text-ink leading-relaxed">
                    {typeof value === "string" ? value : JSON.stringify(value, null, 1)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyEdit}
                disabled={editApplying}
                className="flex-1 py-2.5 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
              >
                {editApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("common.save")}
              </button>
              <button
                onClick={() => { setEditUpdates(null); setPrompt(""); }}
                className="px-4 py-2.5 bg-background border border-ink-3/20 text-ink-2 rounded-md text-[18px] hover:text-ink"
              >
                {t("ai.reject")}
              </button>
            </div>
          </div>
        )}

        {/* Generate groups: prompt */}
        {action === "generate-groups" && genGroups.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAction(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">{t("ai.groupGenTitle")} (5 {t("common.credits")})</span>
            </div>
            <p className="text-[17px] text-ink-3">{t("ai.groupGenHint")}</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t("ai.groupGenPlaceholder")}
              className="w-full h-24 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink resize-none focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleGenerateGroups}
              disabled={loading || !prompt.trim()}
              className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
              {t("ai.generate")} (5 {t("common.credits")})
            </button>
          </div>
        )}

        {/* Generate groups: preview + confirm */}
        {genGroups.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[18px] text-ink font-medium">{t("ai.selectGroups")}</span>
              <button onClick={() => { setGenGroups([]); setSelectedGroupIndices(new Set()); setAction(null); setPrompt(""); }} className="text-ink-3 hover:text-ink text-[17px]">
                {t("common.cancel")}
              </button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {genGroups.map((g, i) => {
                const isSelected = selectedGroupIndices.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedGroupIndices(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      });
                    }}
                    className={`w-full text-left bg-background rounded-lg border p-3 transition-colors ${isSelected ? "border-accent/40 bg-accent-light/10" : "border-ink-3/10 hover:border-ink-3/25"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-accent border-accent" : "border-ink-3/30"}`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-[18px] text-ink font-medium">{g.name}</span>
                      <span className="text-[15px] text-ink-3 tracking-[0.1em] uppercase ml-auto">{g.slug}</span>
                    </div>
                    {g.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {g.fields.map((f, fi) => (
                          <span key={fi} className="text-[14px] bg-ink-3/5 text-ink-3 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (selectedGroupIndices.size === genGroups.length) {
                    setSelectedGroupIndices(new Set());
                  } else {
                    setSelectedGroupIndices(new Set(genGroups.map((_, i) => i)));
                  }
                }}
                className="text-[16px] text-accent hover:underline"
              >
                {selectedGroupIndices.size === genGroups.length ? t("ai.deselectAll") : t("ai.selectAll")}
              </button>
              <span className="text-[16px] text-ink-3">{t("ai.selected")} {selectedGroupIndices.size} {t("ai.of")} {genGroups.length}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmGroups}
                disabled={confirmingGroups || selectedGroupIndices.size === 0}
                className="flex-1 py-2.5 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
              >
                {confirmingGroups ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("ai.createGroups")} {selectedGroupIndices.size} {selectedGroupIndices.size === 1 ? t("ai.group") : t("ai.groupsMany")}
              </button>
              <button
                onClick={() => { setGenGroups([]); setSelectedGroupIndices(new Set()); setAction(null); setPrompt(""); }}
                className="px-4 py-2.5 bg-background border border-ink-3/20 text-ink-2 rounded-md text-[18px] hover:text-ink"
              >
                {t("ai.reject")}
              </button>
            </div>
          </div>
        )}

        {/* Entity preview + confirm */}
        {genEntities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[18px] text-ink font-medium">{t("ai.generated")}: {genEntities.length} {t("ai.entities")}, {genRelations.length} {t("ai.relations")}</span>
              <button onClick={() => { setGenEntities([]); setGenRelations([]); setAction(null); setPrompt(""); }} className="text-ink-3 hover:text-ink text-[17px]">
                {t("common.cancel")}
              </button>
            </div>

            {/* Entity cards */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {genEntities.map((e, i) => (
                <div key={i} className="bg-background rounded-lg border border-ink-3/10 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: resolveGroup(e.type, groups).color }} />
                    <span className="text-[15px] tracking-[0.15em] uppercase text-ink-3">{resolveGroup(e.type, groups).name}</span>
                    <span className="ml-auto text-[17px] text-ink font-medium">{e.name}</span>
                  </div>
                  {e.description && (
                    <p className="text-[17px] text-ink-2 leading-relaxed line-clamp-3">{e.description}</p>
                  )}
                  {e.sources && e.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {e.sources.map((s, si) => (
                        <a key={si} href={s} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[14px] text-accent hover:underline">
                          <ExternalLink size={8} /> {t("ai.source")}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Relations preview */}
            {genRelations.length > 0 && (
              <div className="space-y-1">
                <span className="text-[16px] text-ink-3 tracking-[0.15em] uppercase flex items-center gap-1"><GitBranch size={10} /> {t("entity.relations")}</span>
                {genRelations.map((r, i) => (
                  <div key={i} className="text-[16px] text-ink-2 flex items-center gap-1">
                    <span className="text-ink">{genEntities[r.sourceIndex]?.name || "?"}</span>
                    <span className="text-accent">→</span>
                    <span className="text-ink-3">{r.label}</span>
                    <span className="text-accent">→</span>
                    <span className="text-ink">{genEntities[r.targetIndex]?.name || "?"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm / Reject */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmEntities}
                disabled={confirming}
                className="flex-1 py-2.5 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
              >
                {confirming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("ai.confirmEntities")}
              </button>
              <button
                onClick={() => { setGenEntities([]); setGenRelations([]); setAction(null); setPrompt(""); }}
                className="px-4 py-2.5 bg-background border border-ink-3/20 text-ink-2 rounded-md text-[18px] hover:text-ink"
              >
                {t("ai.reject")}
              </button>
            </div>
          </div>
        )}

        {/* Text generation prompt (scenario, suggestion, expand, edit) */}
        {action && action !== "generate-entities" && action !== "edit-entity" && action !== "generate-groups" && !showImageGen && !result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAction(null); setResult(null); setNoteEntityId(null); }} className="text-ink-3 hover:text-ink">
                ← {t("common.back")}
              </button>
              <span className="text-[18px] text-ink">{selectedAction?.label} ({selectedAction?.cost} {t("common.credits")})</span>
            </div>
            <p className="text-[17px] text-ink-3">{selectedAction?.description}</p>

            {/* Select entity for note/text actions */}
            {(isNoteAction || isEntityTextAction) && !noteEntityId && (
              <div className="space-y-2">
                <span className="text-[16px] text-ink-3 tracking-[0.15em] uppercase">{t("ai.selectEntity")}</span>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {entities.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setNoteEntityId(e.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-3/10 hover:border-accent/40 hover:bg-accent-light/20 transition-colors text-left"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveGroup(e.type, groups).color }} />
                      <span className="text-[18px] text-ink flex-1 truncate">{e.name}</span>
                      <span className="text-[15px] tracking-[0.1em] uppercase text-ink-3">{resolveGroup(e.type, groups).name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isNoteAction || isEntityTextAction) && noteEntityId && (
              <div className="flex items-center gap-2 text-[17px]">
                <span className="text-ink-3">{t("ai.forEntity")}</span>
                <span className="text-ink font-medium">{entities.find(e => e.id === noteEntityId)?.name}</span>
                <button onClick={() => setNoteEntityId(null)} className="text-ink-3 hover:text-ink ml-1">✕</button>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                action === "scenario" ? t("ai.scenarioPlaceholder") :
                action === "suggestion" ? t("ai.suggestionPlaceholder") :
                action === "expand" ? t("ai.expandPlaceholder") :
                t("ai.rewritePlaceholder")
              }
              className="w-full h-24 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink resize-none focus:outline-none focus:border-accent"
            />
            {prompt.trim() && (
              <button
                onClick={handleImprovePrompt}
                disabled={improvingPrompt}
                className="w-full py-1.5 bg-background border border-ink-3/15 text-ink-2 rounded-md text-[17px] flex items-center justify-center gap-1.5 hover:text-ink hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                {improvingPrompt ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {t("ai.improvePrompt")} (0.5 {t("common.credits")})
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim() || ((isNoteAction || isEntityTextAction) && !noteEntityId)}
              className="w-full py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {t("ai.generate")} ({selectedAction?.cost} {t("common.credits")})
            </button>
          </div>
        )}

        {/* Text result — auto-save as note */}
        {result && (
          <div className="space-y-3">
            <div className="bg-background rounded-md border border-ink-3/10 p-3 max-h-[300px] overflow-y-auto">
              <div className="text-[19px] text-ink whitespace-pre-wrap leading-relaxed">{result}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="flex-1 py-2 bg-accent text-white rounded-md text-[18px] flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50"
              >
                {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("ai.saveNote")}
              </button>
              <button
                onClick={() => { setResult(null); }}
                className="flex-1 py-2 bg-background border border-ink-3/20 text-ink-2 rounded-md text-[18px] hover:text-ink"
              >
                {t("ai.generate")}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-[18px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
