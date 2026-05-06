import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, compileBookSchema } from "@/lib/validators";

interface ChapterSection {
  title: string;
  content: string;
  entityName?: string;
}

interface StorylineSection {
  title: string;
  description: string;
  color: string;
  chapters: ChapterSection[];
}

interface EntitySection {
  name: string;
  type: string;
  description: string;
  groupName?: string;
}

interface CompiledContent {
  title: string;
  universeName: string;
  type: string;
  sections: StorylineSection[];
  entities: EntitySection[];
  compiledAt: string;
}

// POST /api/books/compile — compile book from universe data
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(compileBookSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId, type = "novel", storylineIds } = parsed.data;

  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      storylines: {
        where: storylineIds?.length ? { id: { in: storylineIds } } : undefined,
        orderBy: { sortOrder: "asc" },
        include: { chapters: { orderBy: { sortOrder: "asc" } } },
      },
      entities: {
        include: { group: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      groups: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!universe) return NextResponse.json({ error: "Universe not found" }, { status: 404 });
  if (universe.userId !== session.user.id) {
    // Check team
    let canAccess = false;
    if (universe.teamId) {
      const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId: session.user.id } });
      if (member) canAccess = true;
      const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: session.user.id } });
      if (owner) canAccess = true;
    }
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const compiled: CompiledContent = {
    title: universe.name,
    universeName: universe.name,
    type,
    sections: universe.storylines.map(s => ({
      title: s.title,
      description: s.description,
      color: s.color,
      chapters: s.chapters.map(ch => ({
        title: ch.title,
        content: ch.content,
        entityName: ch.entityId ? universe.entities.find(e => e.id === ch.entityId)?.name : undefined,
      })),
    })),
    entities: universe.entities.map(e => ({
      name: e.name,
      type: e.type,
      description: e.description || "",
      groupName: e.group?.name,
    })),
    compiledAt: new Date().toISOString(),
  };

  return NextResponse.json(compiled);
}
