import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/team — get current user's team info
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find team where user is owner or member
  const membership = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          invitations: { where: { status: "pending" }, include: { invitee: { select: { id: true, name: true, email: true } } } },
          universes: { select: { id: true, name: true, slug: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Also check if user owns a team
  const ownedTeam = await prisma.team.findFirst({
    where: { ownerId: session.user.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      invitations: { where: { status: "pending" }, include: { invitee: { select: { id: true, name: true, email: true } } } },
      universes: { select: { id: true, name: true, slug: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  const team = ownedTeam || membership?.team;
  if (!team) {
    return NextResponse.json({ team: null });
  }

  const myRole = team.ownerId === session.user.id ? "admin" : membership?.role || "member";

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      myRole,
      owner: team.owner,
      members: team.members.map(m => ({ id: m.id, role: m.role, joinedAt: m.joinedAt, user: m.user })),
      pendingInvitations: team.invitations,
      universes: team.universes,
      maxMembers: 10,
    },
  });
}

// POST /api/team — create team (when upgrading to corporate)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Team name required" }, { status: 400 });
  }

  // Check corporate subscription
  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub || sub.plan !== "corporate") {
    return NextResponse.json({ error: "Corporate subscription required" }, { status: 403 });
  }

  // Check if team already exists for this subscription
  const existing = await prisma.team.findUnique({ where: { subscriptionId: sub.id } });
  if (existing) {
    return NextResponse.json({ error: "Team already exists", teamId: existing.id }, { status: 409 });
  }

  const slug = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").slice(0, 30);

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      slug,
      ownerId: session.user.id,
      subscriptionId: sub.id,
      members: {
        create: { userId: session.user.id, role: "admin" },
      },
    },
  });

  return NextResponse.json({ teamId: team.id, name: team.name, slug: team.slug });
}
