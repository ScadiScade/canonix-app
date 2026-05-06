import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, exportBookSchema } from "@/lib/validators";

interface ParsedChapter { title: string; content: string }
interface ParsedPanel { description: string; dialogue?: string; character?: string }
interface ParsedPage { panels: ParsedPanel[] }
interface ParsedSection { title: string; content: string; description?: string; chapters?: ParsedChapter[] }
interface ParsedEntity { name: string; type: string; description?: string }
interface ParsedBook {
  chapters?: ParsedChapter[];
  pages?: ParsedPage[];
  sections?: ParsedSection[];
  entities?: ParsedEntity[];
}

function bookToMarkdown(book: { title: string; description: string; type: string; content: string }): string {
  const parsed = safeParse(book.content);
  let md = `# ${book.title}\n\n`;
  if (book.description) md += `${book.description}\n\n`;

  if (book.type === "novel" && Array.isArray(parsed.chapters)) {
    for (const ch of parsed.chapters) {
      md += `## ${ch.title}\n\n${ch.content}\n\n`;
    }
  } else if (book.type === "comic" && Array.isArray(parsed.pages)) {
    for (let i = 0; i < parsed.pages.length; i++) {
      md += `## Страница ${i + 1}\n\n`;
      for (const panel of parsed.pages[i].panels) {
        md += `**Панель:** ${panel.description}\n\n`;
        if (panel.character && panel.dialogue) {
          md += `— ${panel.dialogue} — *${panel.character}*\n\n`;
        } else if (panel.dialogue) {
          md += `— ${panel.dialogue}\n\n`;
        }
      }
    }
  } else if (book.type === "guide" && Array.isArray(parsed.sections)) {
    for (const sec of parsed.sections) {
      md += `## ${sec.title}\n\n${sec.content}\n\n`;
    }
  } else if (Array.isArray(parsed.sections)) {
    for (const sec of parsed.sections) {
      md += `## ${sec.title}\n\n`;
      if (sec.description) md += `${sec.description}\n\n`;
      if (Array.isArray(sec.chapters)) {
        for (const ch of sec.chapters) {
          md += `### ${ch.title}\n\n${ch.content}\n\n`;
        }
      }
    }
    if (Array.isArray(parsed.entities) && parsed.entities.length) {
      md += `## Сущности\n\n`;
      for (const e of parsed.entities) {
        md += `### ${e.name} (${e.type})\n\n${e.description || "Нет описания"}\n\n`;
      }
    }
  }

  return md;
}

function safeParse(content: string): ParsedBook {
  try { return JSON.parse(content); } catch { return {}; }
}

// POST /api/books/export — export book as markdown or PDF
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(exportBookSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, format } = parsed.data;

  const book = await prisma.book.findUnique({ where: { id }, include: { universe: true } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access check
  const userId = session.user.id;
  let canAccess = book.universe.userId === userId;
  if (!canAccess && book.universe.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: book.universe.teamId, userId } });
    if (member) canAccess = true;
  }
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (format === "markdown") {
    const md = bookToMarkdown(book);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${book.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}.md"`,
      },
    });
  }

  // PDF — return markdown for now (PDF generation requires additional deps)
  const md = bookToMarkdown(book);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${book.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}.md"`,
    },
  });
}
