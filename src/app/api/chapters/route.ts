import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createChapterSchema, updateChapterSchema, deleteChapterSchema } from "@/lib/validators";

// POST /api/chapters — create chapter
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createChapterSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { storylineId, title, content, entityId } = parsed.data;

  // Verify ownership via storyline → universe
  const storyline = await prisma.storyline.findUnique({
    where: { id: storylineId },
    include: { universe: true },
  });
  if (!storyline) return NextResponse.json({ error: "Storyline not found" }, { status: 404 });

  const userId = session.user.id;
  const universe = storyline.universe;
  let canModify = universe.userId === userId;
  if (!canModify && universe.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId } });
    if (member) canModify = true;
    const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: userId } });
    if (owner) canModify = true;
  }
  if (!canModify) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get max sortOrder
  const maxSort = await prisma.chapter.findFirst({
    where: { storylineId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const chapter = await prisma.chapter.create({
    data: {
      title: title.trim(),
      content: content || "",
      storylineId,
      entityId: entityId || null,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(chapter, { status: 201 });
}

// PUT /api/chapters — update chapter
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(updateChapterSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, title, content, entityId, sortOrder } = parsed.data;

  const existing = await prisma.chapter.findUnique({
    where: { id },
    include: { storyline: { include: { universe: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const universe = existing.storyline.universe;
  let canModify = universe.userId === userId;
  if (!canModify && universe.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId } });
    if (member) canModify = true;
    const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: userId } });
    if (owner) canModify = true;
  }
  if (!canModify) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const chapter = await prisma.chapter.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(entityId !== undefined && { entityId: entityId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(chapter);
}

// DELETE /api/chapters — delete chapter
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(deleteChapterSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.chapter.findUnique({
    where: { id },
    include: { storyline: { include: { universe: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const universe = existing.storyline.universe;
  let canModify = universe.userId === userId;
  if (!canModify && universe.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId } });
    if (member) canModify = true;
    const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: userId } });
    if (owner) canModify = true;
  }
  if (!canModify) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.chapter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
