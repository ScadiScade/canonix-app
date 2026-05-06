import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canModifyUniverse } from "@/lib/api-auth";

// POST /api/maps — create a map
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, universeId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!universeId || typeof universeId !== "string") {
    return NextResponse.json({ error: "universeId is required" }, { status: 400 });
  }

  const access = await canModifyUniverse(universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = await (prisma as any).map.create({
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description : "",
      universeId,
    },
  });

  return NextResponse.json(map, { status: 201 });
}

// PUT /api/maps — update a map
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, description } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = await (prisma as any).map.findUnique({
    where: { id },
    select: { universeId: true },
  });
  if (!map) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  const access = await canModifyUniverse(map.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).map.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/maps — delete a map
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = await (prisma as any).map.findUnique({
    where: { id },
    select: { universeId: true },
  });
  if (!map) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  const access = await canModifyUniverse(map.universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).map.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
