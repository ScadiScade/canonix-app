import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canModifyUniverse } from "@/lib/api-auth";

// POST /api/maps/generate — generate a placeholder map
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { universeId } = body;

  if (!universeId || typeof universeId !== "string") {
    return NextResponse.json({ error: "universeId is required" }, { status: 400 });
  }

  const access = await canModifyUniverse(universeId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // For now, generate a simple placeholder map based on universe entities
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    select: { name: true },
  });

  if (!universe) {
    return NextResponse.json({ error: "Universe not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = await (prisma as any).map.create({
    data: {
      name: `Карта вселенной «${universe.name}»`,
      description: "Автоматически сгенерированная карта на основе данных вселенной.",
      universeId,
    },
  });

  return NextResponse.json(map, { status: 201 });
}
