import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const universe = await prisma.universe.findUnique({
    where: { slug: params.slug },
    include: {
      user: { select: { name: true } },
      team: { select: { id: true, name: true, slug: true } },
      groups: { orderBy: { createdAt: "asc" } },
      entities: {
        include: {
          group: true,
          parent: { select: { id: true, name: true, type: true } },
          children: { select: { id: true, name: true, type: true } },
          sourceRelations: { include: { target: true } },
          targetRelations: { include: { source: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      relations: true,
      timelineScales: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!universe) {
    return NextResponse.json({ error: "Universe not found" }, { status: 404 });
  }

  return NextResponse.json(universe);
}
