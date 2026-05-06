import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, createUniverseSchema, updateUniverseSchema } from "@/lib/validators";
import { TEMPLATES } from "@/lib/templates";

async function canAccessUniverse(universeId: string, userId: string): Promise<boolean> {
  const existing = await prisma.universe.findUnique({ where: { id: universeId } });
  if (!existing) return false;
  if (existing.userId === userId) return true;
  if (existing.teamId) {
    const teamMember = await prisma.teamMember.findFirst({ where: { teamId: existing.teamId, userId } });
    if (teamMember) return true;
    const teamOwner = await prisma.team.findFirst({ where: { id: existing.teamId, ownerId: userId } });
    if (teamOwner) return true;
  }
  return false;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;

  // Find user's team memberships
  const teamMemberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    select: { teamId: true },
  });
  const teamIds = teamMemberships.map(t => t.teamId);

  // Also check owned teams
  const ownedTeams = await prisma.team.findMany({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  const allTeamIds = [...teamIds, ...ownedTeams.map(t => t.id)];

  const universes = await prisma.universe.findMany({
    where: {
      AND: [
        {
          OR: [
            { userId: session.user.id },
            ...(allTeamIds.length > 0 ? [{ teamId: { in: allTeamIds } }] : []),
          ],
        },
        ...(search ? [{
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }] : []),
      ],
    },
    include: { _count: { select: { entities: true, relations: true } } },
    orderBy: { updatedAt: "desc" },
    skip,
    take: limit,
  });

  const total = await prisma.universe.count({
    where: {
      AND: [
        {
          OR: [
            { userId: session.user.id },
            ...(allTeamIds.length > 0 ? [{ teamId: { in: allTeamIds } }] : []),
          ],
        },
        ...(search ? [{
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }] : []),
      ],
    },
  });

  return NextResponse.json({ universes, total, page, limit });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(createUniverseSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, description, visibility, templateId } = parsed.data;

  const slug = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();

  // Fallback if slug is empty (e.g. name was only special chars)
  const finalSlug = slug || `universe-${Date.now()}`;

  const existing = await prisma.universe.findUnique({ where: { slug: finalSlug } });
  const uniqueSlug = existing ? `${finalSlug}-${Date.now()}` : finalSlug;

  const template = templateId ? TEMPLATES.find(t => t.id === templateId) : null;

  const universe = await prisma.universe.create({
    data: {
      name,
      slug: uniqueSlug,
      description: description || null,
      visibility: visibility || "private",
      userId: session.user.id,
      ...(template && template.groups.length > 0 && {
        groups: {
          createMany: {
            data: template.groups.map(g => ({
              name: g.name,
              slug: g.slug,
              color: g.color,
              icon: g.icon,
              fields: JSON.stringify(g.fields),
              isContainer: g.isContainer || false,
            })),
          },
        },
      }),
    },
    include: { groups: true },
  });

  return NextResponse.json(universe, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(updateUniverseSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id, name, description, visibility, license, price, listedAt } = parsed.data;

  if (!(await canAccessUniverse(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const universe = await prisma.universe.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(visibility !== undefined && { visibility }),
      ...(license !== undefined && { license }),
      ...(price !== undefined && { price }),
      ...(listedAt !== undefined && { listedAt: listedAt ? new Date(listedAt) : null }),
    },
  });

  return NextResponse.json(universe);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!(await canAccessUniverse(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.universe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
