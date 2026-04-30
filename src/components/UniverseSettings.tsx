"use client";

import { useState } from "react";
import { X, Settings, Trash2, Download, Globe, Lock, Link2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface UniverseSettingsProps {
  universe: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    visibility: string;
    license: string;
    price: number;
    listedAt: string | null;
  };
  onUpdate: (data: { id: string; name?: string; description?: string; visibility?: string; license?: string; price?: number; listedAt?: string | null }) => void;
  onDelete: () => void;
  onExport: () => void;
  onClose: () => void;
}

export function UniverseSettings({ universe, onUpdate, onDelete, onExport, onClose }: UniverseSettingsProps) {
  const { t } = useLocale();
  useModalBehavior(true, onClose);
  const [name, setName] = useState(universe.name);
  const [description, setDescription] = useState(universe.description || "");
  const [visibility, setVisibility] = useState(universe.visibility);
  const [license, setLicense] = useState(universe.license);
  const [price, setPrice] = useState(universe.price);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onUpdate({
      id: universe.id,
      name: name.trim() || universe.name,
      description,
      visibility,
      license,
      price: license === "paid" ? price : 0,
      listedAt: license !== "none" ? (universe.listedAt || new Date().toISOString()) : null,
    });
    onClose();
  };

  const visOptions = [
    { value: "private", label: t("universeSettings.visibilityPrivate"), icon: Lock, desc: t("universeSettings.visibilityPrivateDesc") },
    { value: "link", label: t("universeSettings.visibilityLink"), icon: Link2, desc: t("universeSettings.visibilityLinkDesc") + "/s/" + universe.slug },
    { value: "public", label: t("universeSettings.visibilityPublic"), icon: Globe, desc: t("universeSettings.visibilityPublicDesc") },
  ];

  return (
    <div className="fixed inset-0 bg-ink/30 dark:bg-white/20 z-50 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("universeSettings.title")}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface rounded-lg border border-ink-3/20 w-full max-w-md shadow-xl max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-5 p-6 pb-0 flex-shrink-0">
          <h2 className="font-serif text-[22px] font-light text-ink flex items-center gap-2">
            <Settings size={16} />
            {t("universeSettings.title")}
          </h2>
          <button onClick={onClose} aria-label={t("common.close")} className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 py-4 space-y-4">
          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.name")}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[18px] text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("common.description")}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[18px] text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("universeSettings.visibility")}</label>
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

          {/* Marketplace listing */}
          <div className="pt-2 border-t border-ink-3/10">
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-2">{t("universeSettings.marketplaceLicense")}</label>
            <div className="space-y-2">
              {[
                { value: "none", label: t("universeSettings.licenseNone"), desc: t("universeSettings.licenseNoneDesc") },
                { value: "open", label: t("universeSettings.licenseOpen"), desc: t("universeSettings.licenseOpenDesc") },
                { value: "paid", label: t("universeSettings.licensePaid"), desc: t("universeSettings.licensePaidDesc") },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    license === opt.value
                      ? "border-accent bg-accent-light"
                      : "border-ink-3/15 hover:border-ink-3/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="license"
                    value={opt.value}
                    checked={license === opt.value}
                    onChange={() => setLicense(opt.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="text-[17px] text-ink font-medium">{opt.label}</div>
                    <div className="text-[16px] text-ink-3">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {license === "paid" && (
              <div className="mt-3">
                <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1">{t("universeSettings.price")}</label>
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={e => setPrice(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[18px] text-ink focus:outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          {/* Export */}
          <div className="pt-2 border-t border-ink-3/10">
            <button
              onClick={onExport}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-ink-3/15 text-[17px] text-ink-2 hover:text-ink hover:border-ink-3/30 transition-colors"
            >
              <Download size={14} />
              {t("universeSettings.export")}
            </button>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-ink-3/10">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-[17px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={14} />
                {t("universeSettings.deleteUniverse")}
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-[17px] text-red-700 dark:text-red-400 mb-2">
                  {t("universeSettings.deleteWarning")}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onDelete}
                    className="bg-red-500 text-white rounded-md px-3 py-1.5 text-[16px] tracking-[0.1em] uppercase hover:bg-red-600 transition-colors"
                  >
                    {t("universeSettings.deleteForever")}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="bg-surface text-ink-2 rounded-md px-3 py-1.5 text-[16px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-6 pt-4 border-t border-ink-3/10 flex-shrink-0">
          <button
            onClick={handleSave}
            className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors"
          >
            {t("common.save")}
          </button>
          <button
            onClick={onClose}
            className="bg-background text-ink-2 rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-ink-3/10 transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
