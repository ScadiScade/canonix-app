import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createRelationSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createRelationSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { sourceId, targetId, label, universeId } = parsed.data;

  const universe = await prisma.universe.findUnique({ where: { id: universeId } });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const relation = await prisma.relation.findUnique({ where: { id }, include: { universe: true } });
  if (!relation || relation.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.relation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
