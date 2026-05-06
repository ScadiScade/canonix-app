"use client";

import { useState } from "react";
import { Plus, Trash2, BookOpen, Download, Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useCredits } from "@/components/CreditProvider";

interface BookData {
  id: string;
  title: string;
  description: string;
  type: string;
  content: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BooksPanelProps {
  universeId: string;
  books: BookData[];
  onRefresh: () => void;
  toast: (msg: string) => void;
}

interface ParsedChapter { title: string; content: string }
interface ParsedPanel { description: string; dialogue?: string; character?: string }
interface ParsedPage { panels: ParsedPanel[] }
interface ParsedSection { title: string; content: string }

// ── Novel viewer ──
function NovelViewer({ content }: { content: string }) {
  const { t } = useLocale();
  let parsed: { chapters?: ParsedChapter[] } = {};
  try { parsed = JSON.parse(content); } catch {}

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {Array.isArray(parsed.chapters) ? parsed.chapters.map((ch, i) => (
        <div key={i} className="mb-6">
          <h3 className="text-[18px] font-medium text-ink mb-2">{ch.title}</h3>
          <p className="text-[15px] text-ink-2 leading-relaxed whitespace-pre-wrap">{ch.content}</p>
        </div>
      )) : <p className="text-ink-3">{t("books.noContent")}</p>}
    </div>
  );
}

// ── Comic renderer ──
function ComicViewer({ content }: { content: string }) {
  const { t } = useLocale();
  let parsed: { pages?: ParsedPage[] } = {};
  try { parsed = JSON.parse(content); } catch {}

  if (!Array.isArray(parsed.pages)) return <p className="text-ink-3">{t("books.noContent")}</p>;

  return (
    <div className="space-y-6">
      {parsed.pages.map((page, pi) => (
        <div key={pi} className="space-y-2">
          <span className="text-[13px] text-ink-3 tracking-[0.15em] uppercase">{t("books.page")} {pi + 1}</span>
          <div className="grid grid-cols-2 gap-2">
            {Array.isArray(page.panels) ? page.panels.map((panel, ppi) => (
              <div key={ppi} className="bg-surface border border-ink-3/15 rounded-lg p-3 min-h-[120px] flex flex-col justify-between">
                <p className="text-[14px] text-ink-2 leading-relaxed">{panel.description}</p>
                {panel.dialogue && (
                  <div className="mt-2 bg-background rounded-md px-2 py-1 border border-ink-3/10">
                    {panel.character && <span className="text-[13px] text-accent font-medium">{panel.character}: </span>}
                    <span className="text-[14px] text-ink italic">{panel.dialogue}</span>
                  </div>
                )}
              </div>
            )) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Guide viewer ──
function GuideViewer({ content }: { content: string }) {
  const { t } = useLocale();
  let parsed: { sections?: ParsedSection[] } = {};
  try { parsed = JSON.parse(content); } catch {}

  return (
    <div className="space-y-4">
      {Array.isArray(parsed.sections) ? parsed.sections.map((sec, i) => (
        <div key={i}>
          <h3 className="text-[18px] font-medium text-ink mb-2">{sec.title}</h3>
          <p className="text-[15px] text-ink-2 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
        </div>
      )) : <p className="text-ink-3">{t("books.noContent")}</p>}
    </div>
  );
}

// ── Main panel ──
export function BooksPanel({ universeId, books, onRefresh, toast }: BooksPanelProps) {
  const { t } = useLocale();
  const { setBalance } = useCredits();
  const [viewingBook, setViewingBook] = useState<BookData | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("novel");

  // AI generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiType, setAiType] = useState<string>("novel");
  const [aiPrompt, setAiPrompt] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, title: newTitle.trim(), type: newType }),
      });
      if (res.ok) {
        setNewTitle(""); onRefresh(); toast(t("books.created"));
      }
    } finally { setCreating(false); }
  };

  const handleCompile = async (type: string) => {
    setCreating(true);
    try {
      const compileRes = await fetch("/api/books/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, type }),
      });
      if (!compileRes.ok) { toast(t("common.error")); return; }
      const compiled = await compileRes.json();

      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universeId,
          title: `${compiled.universeName} — ${t("books.compiled")}`,
          description: t("books.compiledDesc"),
          type,
        }),
      });
      if (!createRes.ok) { toast(t("common.error")); return; }
      const book = await createRes.json();

      // Save compiled content into the book
      await fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: book.id, content: JSON.stringify(compiled) }),
      });

      onRefresh(); toast(t("books.compiledOk"));
    } finally { setCreating(false); }
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, type: aiType, prompt: aiPrompt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || t("common.error"));
        if (data.balance !== undefined) setBalance(data.balance);
      } else {
        setAiPrompt("");
        setBalance(data.balance);
        onRefresh(); toast(t("books.aiGenerated"));
      }
    } catch { toast(t("common.error")); }
    finally { setAiGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("books.confirmDelete"))) return;
    try {
      await fetch("/api/books", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      onRefresh(); toast(t("books.deleted"));
    } catch {}
  };

  const handleExport = async (id: string) => {
    try {
      const res = await fetch("/api/books/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, format: "markdown" }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "book.md"; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  const TYPE_LABELS: Record<string, string> = {
    novel: t("books.novel"),
    comic: t("books.comic"),
    guide: t("books.guide"),
  };

  // ── Book viewer ──
  if (viewingBook) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewingBook(null)} className="text-ink-3 hover:text-ink">← {t("common.back")}</button>
          <span className="text-[18px] text-ink font-medium flex-1">{viewingBook.title}</span>
          <span className="text-[13px] text-ink-3 bg-surface px-2 py-0.5 rounded">{TYPE_LABELS[viewingBook.type] || viewingBook.type}</span>
          <button onClick={() => handleExport(viewingBook.id)} className="text-ink-3 hover:text-ink flex items-center gap-1 text-[14px]"><Download size={14} /> MD</button>
        </div>
        {viewingBook.type === "novel" && <NovelViewer content={viewingBook.content} />}
        {viewingBook.type === "comic" && <ComicViewer content={viewingBook.content} />}
        {viewingBook.type === "guide" && <GuideViewer content={viewingBook.content} />}
      </div>
    );
  }

  // ── Book list ──
  return (
    <div className="space-y-4">
      <h2 className="text-[20px] font-light text-ink tracking-wide">{t("books.title")}</h2>

      {/* Create / Compile / AI generate */}
      <div className="bg-background border border-ink-3/15 rounded-lg p-3 space-y-3">
        <div className="flex gap-2 items-end">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t("books.titlePlaceholder")} className="flex-1 bg-surface border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent" />
          <select value={newType} onChange={e => setNewType(e.target.value)} className="bg-surface border border-ink-3/20 rounded-md px-2 py-2 text-[15px] text-ink focus:outline-none focus:border-accent">
            <option value="novel">{t("books.novel")}</option>
            <option value="comic">{t("books.comic")}</option>
            <option value="guide">{t("books.guide")}</option>
          </select>
          <button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="px-4 py-2 bg-accent text-white rounded-md text-[15px] flex items-center gap-1.5 hover:bg-accent/90 disabled:opacity-50">
            <Plus size={14} /> {t("books.create")}
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleCompile("novel")} disabled={creating} className="flex-1 py-2 bg-surface border border-ink-3/15 rounded-md text-[14px] text-ink-2 hover:text-ink flex items-center justify-center gap-1.5 disabled:opacity-50">
            <BookOpen size={14} /> {t("books.compileNovel")}
          </button>
          <button onClick={() => handleCompile("guide")} disabled={creating} className="flex-1 py-2 bg-surface border border-ink-3/15 rounded-md text-[14px] text-ink-2 hover:text-ink flex items-center justify-center gap-1.5 disabled:opacity-50">
            <BookOpen size={14} /> {t("books.compileGuide")}
          </button>
        </div>

        {/* AI generate */}
        <div className="border-t border-ink-3/10 pt-3 space-y-2">
          <span className="text-[13px] tracking-[0.15em] uppercase text-ink-3">{t("books.aiGenerate")} (10 {t("common.credits")})</span>
          <div className="flex gap-2 items-end">
            <select value={aiType} onChange={e => setAiType(e.target.value)} className="bg-surface border border-ink-3/20 rounded-md px-2 py-2 text-[15px] text-ink focus:outline-none focus:border-accent">
              <option value="novel">{t("books.novel")}</option>
              <option value="comic">{t("books.comic")}</option>
              <option value="guide">{t("books.guide")}</option>
            </select>
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder={t("books.aiPromptPlaceholder")} className="flex-1 bg-surface border border-ink-3/20 rounded-md px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent" />
            <button onClick={handleAiGenerate} disabled={aiGenerating} className="px-4 py-2 bg-accent text-white rounded-md text-[15px] flex items-center gap-1.5 hover:bg-accent/90 disabled:opacity-50">
              {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {t("books.aiGenerate")}
            </button>
          </div>
        </div>
      </div>

      {/* Book list */}
      {books.map(b => (
        <div key={b.id} className="bg-background border border-ink-3/15 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setViewingBook(b)}>
          <div className="w-10 h-14 bg-surface rounded flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} className="text-ink-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] text-ink font-medium truncate">{b.title}</div>
            <div className="text-[13px] text-ink-3">{TYPE_LABELS[b.type] || b.type} · {new Date(b.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => handleExport(b.id)} className="text-ink-3 hover:text-ink p-1"><Download size={14} /></button>
            <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {books.length === 0 && (
        <p className="text-center text-[15px] text-ink-3 py-6">{t("books.empty")}</p>
      )}
    </div>
  );
}
