import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createRelationSchema } from "@/lib/validators";
import { canModifyUniverse } from "@/lib/api-auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createRelationSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { sourceId, targetId, label, universeId } = parsed.data;

  const access = await canModifyUniverse(universeId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify source and target entities belong to this universe
  const [source, target] = await Promise.all([
    prisma.entity.findUnique({ where: { id: sourceId }, select: { universeId: true } }),
    prisma.entity.findUnique({ where: { id: targetId }, select: { universeId: true } }),
  ]);
  if (!source || source.universeId !== universeId) {
    return NextResponse.json({ error: "Source entity not found in this universe" }, { status: 400 });
  }
  if (!target || target.universeId !== universeId) {
    return NextResponse.json({ error: "Target entity not found in this universe" }, { status: 400 });
  }

  const relation = await prisma.relation.create({
    data: { sourceId, targetId, label, universeId },
    include: { source: true, target: true },
  });

  return NextResponse.json(relation, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const relation = await prisma.relation.findUnique({ where: { id }, select: { universeId: true } });
  if (!relation) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }

  const access = await canModifyUniverse(relation.universeId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.relation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
