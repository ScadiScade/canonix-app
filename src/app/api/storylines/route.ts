import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createStorylineSchema, updateStorylineSchema, deleteStorylineSchema } from "@/lib/validators";

async function canModifyUniverse(universeId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  const universe = await prisma.universe.findUnique({ where: { id: universeId } });
  if (!universe) return false;
  if (universe.userId === session.user.id) return true;
  if (universe.teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId: session.user.id } });
    if (member) return true;
    const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: session.user.id } });
    if (owner) return true;
  }
  return false;
}

// POST /api/storylines — create storyline
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createStorylineSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId, title, description, color } = parsed.data;

  const access = await canModifyUniverse(universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get max sortOrder
  const maxSort = await prisma.storyline.findFirst({
    where: { universeId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const storyline = await prisma.storyline.create({
    data: {
      title: title.trim(),
      description: description || "",
      color: color || "#78716C",
      universeId,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(storyline, { status: 201 });
}

// PUT /api/storylines — update storyline
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(updateStorylineSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, title, description, color, sortOrder } = parsed.data;

  const existing = await prisma.storyline.findUnique({ where: { id }, include: { universe: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await canModifyUniverse(existing.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const storyline = await prisma.storyline.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(storyline);
}

// DELETE /api/storylines — delete storyline
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(deleteStorylineSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.storyline.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await canModifyUniverse(existing.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.storyline.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
