"use client";

import { useState, useRef } from "react";
import { X, Upload, FileJson } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface ImportDialogProps {
  onImport: (data: Record<string, unknown>) => Promise<string | null>;
  onCancel: () => void;
}

export function ImportDialog({ onImport, onCancel }: ImportDialogProps) {
  const { t } = useLocale();
  useModalBehavior(true, onCancel);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.name || typeof json.name !== "string") {
          setError(t("import.noName"));
          setParsedData(null);
          return;
        }
        setParsedData(json);
      } catch {
        setError(t("import.invalidJson"));
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!parsedData || importing) return;
    setImporting(true);
    setError(null);
    const slug = await onImport(parsedData);
    setImporting(false);
    if (!slug) {
      setError(t("common.error"));
    }
  };

  const entityCount = parsedData && Array.isArray(parsedData.entities) ? parsedData.entities.length : 0;
  const groupCount = parsedData && Array.isArray(parsedData.groups) ? parsedData.groups.length : 0;
  const relationCount = parsedData && Array.isArray(parsedData.relations) ? parsedData.relations.length : 0;

  return (
    <div className="fixed inset-0 bg-ink/60 dark:bg-white/30 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onCancel} role="dialog" aria-modal="true" aria-label={t("import.title")}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface sm:rounded-lg rounded-t-2xl border border-ink-3/20 w-full sm:max-w-md shadow-xl max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-5 p-6 pb-0 flex-shrink-0">
          <h2 className="font-serif text-[22px] font-light text-ink">{t("import.title")}</h2>
          <button type="button" onClick={onCancel} aria-label={t("common.close")} className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-[15px] rounded-lg px-3 py-2">{error}</div>
          )}

          {!parsedData ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-ink-3/25 rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
            >
              <Upload size={32} className="mx-auto mb-3 text-ink-3" />
              <div className="text-[17px] text-ink font-medium mb-1">{t("import.dropzone")}</div>
              <div className="text-[14px] text-ink-3">{t("import.dropzoneHint")}</div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-light border border-accent/20">
                <FileJson size={18} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] text-ink font-medium truncate">{fileName}</div>
                  <div className="text-[14px] text-ink-3">
                    {t("import.preview")}: {groupCount} {t("import.groups")}, {entityCount} {t("import.entities")}, {relationCount} {t("import.relations")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setParsedData(null); setFileName(null); }}
                  className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 rounded-lg border border-ink-3/15">
                <div className="text-[17px] text-ink font-medium">{String(parsedData.name)}</div>
                {typeof parsedData.description === "string" && parsedData.description && (
                  <div className="text-[15px] text-ink-2 mt-1 line-clamp-2">{parsedData.description}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-4 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!parsedData || importing}
            className="bg-accent text-white rounded-xl px-5 py-2 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {importing ? t("common.loading") : t("import.import")}
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
    </div>
  );
}
