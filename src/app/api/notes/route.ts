import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canModifyUniverse } from "@/lib/api-auth";

// POST /api/notes — create a note
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, universeId, entityId, sortOrder } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!universeId || typeof universeId !== "string") {
    return NextResponse.json({ error: "universeId is required" }, { status: 400 });
  }

  const access = await canModifyUniverse(universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const note = await prisma.note.create({
    data: {
      title: title.trim(),
      content: typeof content === "string" ? content : "",
      universeId,
      entityId: entityId || null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
  });

  return NextResponse.json(note, { status: 201 });
}

// PUT /api/notes — update a note
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, title, content, entityId, sortOrder } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const note = await prisma.note.findUnique({
    where: { id },
    select: { universeId: true },
  });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const access = await canModifyUniverse(note.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(entityId !== undefined && { entityId: entityId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/notes — delete a note
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const note = await prisma.note.findUnique({
    where: { id },
    select: { universeId: true },
  });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const access = await canModifyUniverse(note.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
