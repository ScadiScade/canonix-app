"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Globe, Lock, Link2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface UniverseCreateFormProps {
  onSubmit: (data: { name: string; description: string; visibility: string }) => Promise<string | null>;
  onCancel: () => void;
}

export function UniverseCreateForm({ onSubmit, onCancel }: UniverseCreateFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  useModalBehavior(true, onCancel);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const slug = await onSubmit({ name: name.trim(), description: description.trim(), visibility });
    setSubmitting(false);
    if (slug) {
      setName("");
      setDescription("");
      setVisibility("private");
      router.push(`/u/${slug}`);
    }
  };

  const visOptions = [
    { value: "private", label: t("universeSettings.visibilityPrivate"), icon: Lock, desc: t("universeSettings.visibilityPrivateDesc") },
    { value: "link", label: t("universeSettings.visibilityLink"), icon: Link2, desc: t("universeSettings.visibilityLinkDesc") },
    { value: "public", label: t("universeSettings.visibilityPublic"), icon: Globe, desc: t("universeSettings.visibilityPublicDesc") },
  ];

  return (
    <div className="fixed inset-0 bg-ink/30 dark:bg-white/20 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onCancel} role="dialog" aria-modal="true" aria-label={t("createUniverse.title")}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-surface sm:rounded-lg rounded-t-2xl border border-ink-3/20 w-full sm:max-w-md shadow-xl max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-5 p-6 pb-0 flex-shrink-0">
          <h2 className="font-serif text-[22px] font-light text-ink">{t("createUniverse.title")}</h2>
          <button type="button" onClick={onCancel} aria-label={t("common.close")} className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-[15px] rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label htmlFor="universe-name" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.name")}</label>
            <input
              id="universe-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[18px] text-ink focus:outline-none focus:border-accent"
              placeholder={t("createUniverse.namePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="universe-desc" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.description")}</label>
            <textarea
              id="universe-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[18px] text-ink focus:outline-none focus:border-accent resize-none"
              placeholder={t("createUniverse.descriptionPlaceholder")}
            />
          </div>

          <div>
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("universeSettings.visibility")}</span>
            <div className="space-y-2">
              {visOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      visibility === opt.value
                        ? "border-accent bg-accent-light"
                        : "border-ink-3/15 hover:border-ink-3/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={visibility === opt.value}
                      onChange={() => setVisibility(opt.value)}
                      className="mt-0.5 accent-accent"
                    />
                    <Icon size={14} className="mt-0.5 text-ink-2 flex-shrink-0" />
                    <div>
                      <div className="text-[17px] text-ink font-medium">{opt.label}</div>
                      <div className="text-[16px] text-ink-3">{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-6 pt-4 flex-shrink-0">
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {submitting ? t("common.loading") : t("common.create")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-background text-ink-2 rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
