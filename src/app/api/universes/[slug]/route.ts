import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

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
      notes: { orderBy: { sortOrder: "asc" } },
      maps: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!universe) {
    return NextResponse.json({ error: "Universe not found" }, { status: 404 });
  }

  // Access control: private universes only accessible to owner or team members
  if (universe.visibility === "private" && universe.userId !== userId) {
    // Check team membership
    if (universe.teamId && userId) {
      const isMember = await prisma.teamMember.findFirst({
        where: { teamId: universe.teamId, userId },
      });
      const isOwner = await prisma.team.findFirst({
        where: { id: universe.teamId, ownerId: userId },
      });
      if (!isMember && !isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // "link" visibility: accessible to anyone with the link (no auth required)
  // "public" visibility: accessible to everyone

  return NextResponse.json(universe);
}
