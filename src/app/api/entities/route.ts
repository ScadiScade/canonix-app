import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createEntitySchema, updateEntitySchema } from "@/lib/validators";

async function checkOwner(universeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const universe = await prisma.universe.findUnique({ where: { id: universeId } });
  if (!universe || universe.userId !== session.user.id) return null;
  return session;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createEntitySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, type, universeId, description, date, customFields, notes, parentId } = parsed.data;

  const owner = await checkOwner(universeId);
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entity = await prisma.entity.create({
    data: {
      name,
      type,
      universeId,
      description: description || null,
      date: date || null,
      customFields: JSON.stringify(customFields || {}),
      notes: JSON.stringify(notes || []),
      ...(parentId && { parentId }),
    },
  });

  return NextResponse.json(entity, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = JSON.parse(await req.text());
  const parsed = validateBody(updateEntitySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, name, type, description, date, customFields, notes, imageUrl, parentId } = parsed.data;

  // Verify ownership via entity's universe
  const entity = await prisma.entity.findUnique({ where: { id }, include: { universe: true } });
  if (!entity || entity.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.entity.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date }),
      ...(customFields !== undefined && { customFields: JSON.stringify(customFields) }),
      ...(notes !== undefined && { notes: JSON.stringify(notes) }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const entity = await prisma.entity.findUnique({ where: { id }, include: { universe: true } });
  if (!entity || entity.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.entity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
