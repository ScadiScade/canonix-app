import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createGroupSchema, updateGroupSchema } from "@/lib/validators";
import { canModifyUniverse } from "@/lib/api-auth";

// POST /api/groups — create a new group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(createGroupSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId, name, slug, color, icon, fields, isContainer } = parsed.data;

  const access = await canModifyUniverse(universeId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check slug uniqueness within universe
  const existing = await prisma.entityGroup.findUnique({
    where: { slug_universeId: { slug, universeId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Группа с таким slug уже существует" }, { status: 409 });
  }

  const group = await prisma.entityGroup.create({
    data: {
      name,
      slug,
      color: color || "#78716C",
      icon: icon || "Tag",
      fields: JSON.stringify(fields || []),
      isContainer: isContainer || false,
      universeId,
    },
  });

  return NextResponse.json(group, { status: 201 });
}

// PUT /api/groups — update a group
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(updateGroupSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, name, slug, color, icon, fields, isContainer } = parsed.data;

  const group = await prisma.entityGroup.findUnique({
    where: { id },
    include: { universe: { select: { userId: true, teamId: true, id: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const access = await canModifyUniverse(group.universe.id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.entityGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(fields !== undefined && { fields: JSON.stringify(fields) }),
      ...(isContainer !== undefined && { isContainer }),
    },
  });

  // If slug changed, update all entities with old type to new type
  if (slug && slug !== group.slug) {
    await prisma.entity.updateMany({
      where: { type: group.slug, universeId: group.universeId },
      data: { type: slug },
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/groups — delete a group
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const group = await prisma.entityGroup.findUnique({
    where: { id },
    include: { universe: { select: { userId: true, teamId: true, id: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const access = await canModifyUniverse(group.universe.id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Set entities with this group type to a generic type, then delete group
  await prisma.entity.updateMany({
    where: { type: group.slug, universeId: group.universeId },
    data: { type: "other", groupId: null },
  });

  await prisma.entityGroup.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
