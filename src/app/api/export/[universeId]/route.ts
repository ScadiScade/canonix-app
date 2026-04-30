import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/export/[universeId]?format=json|markdown
export async function GET(req: NextRequest, { params }: { params: { universeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { universeId } = params;
  const format = new URL(req.url).searchParams.get("format") || "json";

  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      groups: { orderBy: { createdAt: "asc" } },
      entities: {
        include: {
          sourceRelations: { include: { target: true } },
          targetRelations: { include: { source: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (format === "markdown") {
    const md = exportMarkdown(universe);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${universe.slug}.md"`,
      },
    });
  }

  // JSON export
  const data = {
    name: universe.name,
    description: universe.description,
    visibility: universe.visibility,
    groups: universe.groups,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entities: universe.entities.map((e: any) => ({
      ...e,
      customFields: safeParse(e.customFields, {}),
      notes: safeParse(e.notes, []),
    })),
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${universe.slug}.json"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(val: string | null, fallback: any): any {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportMarkdown(universe: any): string {
  const lines: string[] = [];
  lines.push(`# ${universe.name}`);
  if (universe.description) lines.push(`\n${universe.description}`);

  // Groups
  if (universe.groups.length > 0) {
    lines.push("\n## Groups");
    for (const g of universe.groups) {
      const fields = safeParse(g.fields as string | null, []);
      lines.push(`- **${g.name}** (${g.slug}) — fields: ${Array.isArray(fields) ? fields.join(", ") : String(fields)}`);
    }
  }

  // Entities
  if (universe.entities.length > 0) {
    lines.push("\n## Entities");
    for (const e of universe.entities) {
      lines.push(`\n### ${e.name}`);
      lines.push(`- Type: ${e.type}`);
      if (e.description) lines.push(`- Description: ${e.description}`);
      if (e.date) lines.push(`- Date: ${e.date}`);

      const cf = safeParse(e.customFields, {});
      if (cf && typeof cf === "object") {
        for (const [k, v] of Object.entries(cf)) {
          lines.push(`- ${k}: ${v}`);
        }
      }

      const notes = safeParse(e.notes, []);
      if (Array.isArray(notes) && notes.length > 0) {
        lines.push("- Notes:");
        for (const n of notes) lines.push(`  - ${n}`);
      }

      // Relations
      const rels = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(e.sourceRelations || []).map((r: any) => `${e.name} → ${r.label} → ${r.target?.name || "?"}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(e.targetRelations || []).map((r: any) => `${r.source?.name || "?"} → ${r.label} → ${e.name}`),
      ];
      if (rels.length > 0) {
        lines.push("- Relations:");
        for (const r of rels) lines.push(`  - ${r}`);
      }
    }
  }

  lines.push(`\n---\n*Exported from Canonix on ${new Date().toISOString()}*`);
  return lines.join("\n");
}
