"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Globe, Lock, Link2, ChevronRight, ChevronLeft, Sparkles, Swords, Rocket, Dices, Map, FileQuestion } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { TEMPLATES } from "@/lib/templates";

interface UniverseCreateFormProps {
  onSubmit: (data: { name: string; description: string; visibility: string; templateId?: string }) => Promise<string | null>;
  onCancel: () => void;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  empty: FileQuestion,
  fantasy: Swords,
  scifi: Rocket,
  dnd: Dices,
  real: Map,
};

const TEMPLATE_COLORS: Record<string, string> = {
  empty: "#94A3B8",
  fantasy: "#9333EA",
  scifi: "#06B6D4",
  dnd: "#D97706",
  real: "#16A34A",
};

const STEPS = ["name", "template", "visibility"] as const;
type Step = typeof STEPS[number];

export function UniverseCreateForm({ onSubmit, onCancel }: UniverseCreateFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  useModalBehavior(true, onCancel);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [templateId, setTemplateId] = useState("empty");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const canNext = step === "name" ? name.trim().length > 0 : true;

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };
  const goPrev = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const slug = await onSubmit({
      name: name.trim(),
      description: description.trim(),
      visibility,
      templateId: templateId === "empty" ? undefined : templateId,
    });
    setSubmitting(false);
    if (slug) {
      router.push(`/u/${slug}`);
    }
  };

  const visOptions = [
    { value: "private", label: t("universeSettings.visibilityPrivate"), icon: Lock, desc: t("universeSettings.visibilityPrivateDesc") },
    { value: "link", label: t("universeSettings.visibilityLink"), icon: Link2, desc: t("universeSettings.visibilityLinkDesc") },
    { value: "public", label: t("universeSettings.visibilityPublic"), icon: Globe, desc: t("universeSettings.visibilityPublicDesc") },
  ];

  return (
    <div className="fixed inset-0 bg-ink/60 dark:bg-white/30 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onCancel} role="dialog" aria-modal="true" aria-label={t("createUniverse.title")}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); if (step === "visibility") handleSubmit(); else goNext(); }}
        className="bg-surface sm:rounded-2xl rounded-t-3xl border border-ink-3/20 w-full sm:max-w-lg md:max-w-xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col min-h-0 overflow-hidden"
        style={{ animation: "scaleIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex-1">
            <h2 className="font-serif text-[22px] sm:text-[24px] font-light text-ink">{t("createUniverse.title")}</h2>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mt-3">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => i < stepIndex && setStep(s)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === stepIndex ? "w-8 bg-accent"
                    : i < stepIndex ? "w-4 bg-accent/50 cursor-pointer hover:bg-accent/70"
                    : "w-4 bg-ink-3/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label={t("common.close")} className="p-2 -mr-1 rounded-xl hover:bg-ink-3/10 text-ink-3 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 pb-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-[15px] rounded-xl px-3 py-2 mb-4">{error}</div>
          )}

          {/* Step 1: Name & Description */}
          {step === "name" && (
            <div className="space-y-5 pt-2">
              <div>
                <label htmlFor="universe-name" className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-1.5">{t("common.name")}</label>
                <input
                  id="universe-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background border border-ink-3/20 rounded-xl px-4 py-3 text-[18px] text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  placeholder={t("createUniverse.namePlaceholder")}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="universe-desc" className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-1.5">{t("common.description")}</label>
                <textarea
                  id="universe-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-ink-3/20 rounded-xl px-4 py-3 text-[16px] text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none transition-all"
                  placeholder={t("createUniverse.descriptionPlaceholder")}
                />
                <span className="text-[12px] text-ink-3 mt-1 block text-right">{description.length}/5000</span>
              </div>
            </div>
          )}

          {/* Step 2: Template */}
          {step === "template" && (
            <div className="pt-2">
              <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-3">{t("createUniverse.template")}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TEMPLATES.map(tmpl => {
                  const Icon = TEMPLATE_ICONS[tmpl.id] || FileQuestion;
                  const color = TEMPLATE_COLORS[tmpl.id] || "#94A3B8";
                  const selected = templateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setTemplateId(tmpl.id)}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all duration-150 ${
                        selected
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-ink-3/10 hover:border-ink-3/25 hover:bg-ink-3/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[16px] text-ink font-medium leading-tight">{t(tmpl.nameKey)}</div>
                          <div className="text-[13px] text-ink-3 mt-0.5 leading-snug">{t(tmpl.descKey)}</div>
                          {tmpl.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tmpl.groups.slice(0, 4).map(g => (
                                <span
                                  key={g.slug}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-ink-2 bg-background border border-ink-3/10"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                                  {g.name}
                                </span>
                              ))}
                              {tmpl.groups.length > 4 && (
                                <span className="text-[11px] text-ink-3">+{tmpl.groups.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Visibility */}
          {step === "visibility" && (
            <div className="pt-2">
              <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3 block mb-3">{t("universeSettings.visibility")}</span>
              <div className="space-y-2.5">
                {visOptions.map(opt => {
                  const Icon = opt.icon;
                  const selected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-150 ${
                        selected
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-ink-3/10 hover:border-ink-3/25 hover:bg-ink-3/5"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected ? "bg-accent/15" : "bg-ink-3/5"
                      }`}>
                        <Icon size={18} className={selected ? "text-accent" : "text-ink-2"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[16px] text-ink font-medium">{opt.label}</div>
                        <div className="text-[13px] text-ink-3 leading-snug">{opt.desc}</div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 sm:px-6 py-4 flex-shrink-0 border-t border-ink-3/10">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-[15px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">{t("common.back")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-[15px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-colors"
            >
              {t("common.cancel")}
            </button>
          )}
          <div className="flex-1" />
          {step === "visibility" ? (
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-accent text-white rounded-xl px-6 py-2.5 text-[15px] font-medium tracking-[0.05em] hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? t("common.loading") : t("common.create")}
              {!submitting && <Sparkles size={14} />}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canNext}
              className="bg-accent text-white rounded-xl px-6 py-2.5 text-[15px] font-medium tracking-[0.05em] hover:bg-accent/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {t("createUniverse.next")}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
