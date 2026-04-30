import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateBody, createTimelineScaleSchema, updateTimelineScaleSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(createTimelineScaleSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { name, slug, universeId, eras, isDefault } = parsed.data;

  // Verify ownership
  const universe = await prisma.universe.findUnique({ where: { id: universeId } });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.timelineScale.updateMany({ where: { universeId, isDefault: true }, data: { isDefault: false } });
  }

  const scale = await prisma.timelineScale.create({
    data: { name, slug, universeId, eras: JSON.stringify(eras), isDefault: isDefault || false },
  });

  return NextResponse.json(scale);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = validateBody(updateTimelineScaleSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, name, slug, eras, isDefault } = parsed.data;

  const scale = await prisma.timelineScale.findUnique({ where: { id }, include: { universe: true } });
  if (!scale || scale.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isDefault) {
    await prisma.timelineScale.updateMany({ where: { universeId: scale.universeId, isDefault: true }, data: { isDefault: false } });
  }

  const updated = await prisma.timelineScale.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(eras !== undefined && { eras: JSON.stringify(eras) }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const scale = await prisma.timelineScale.findUnique({ where: { id }, include: { universe: true } });
  if (!scale || scale.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.timelineScale.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
