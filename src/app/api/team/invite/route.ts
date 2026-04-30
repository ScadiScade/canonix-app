import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, inviteTeamSchema, respondInviteSchema, removeMemberSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/team/invite — invite a user to team by email
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "invite");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(inviteTeamSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email } = parsed.data;

  // Find the inviter's team
  const membership = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, role: "admin" },
    include: { team: { include: { members: true, invitations: { where: { status: "pending" } } } } },
  });

  const ownedTeam = !membership ? await prisma.team.findFirst({
    where: { ownerId: session.user.id },
    include: { members: true, invitations: { where: { status: "pending" } } },
  }) : null;

  const team = membership?.team || ownedTeam;
  if (!team) {
    return NextResponse.json({ error: "You are not a team admin" }, { status: 403 });
  }

  // Check member limit (10 max including pending)
  const totalSlots = team.members.length + team.invitations.length;
  if (totalSlots >= 10) {
    return NextResponse.json({ error: "Team is full (max 10 members)" }, { status: 400 });
  }

  // Find user by email
  const invitee = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!invitee) {
    return NextResponse.json({ error: "Пользователь с таким email не найден" }, { status: 404 });
  }

  if (invitee.id === session.user.id) {
    return NextResponse.json({ error: "Нельзя пригласить себя" }, { status: 400 });
  }

  // Check if already a member
  const existingMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: invitee.id } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "Уже участник команды" }, { status: 409 });
  }

  // Check if already invited
  const existingInvite = await prisma.teamInvitation.findUnique({
    where: { unique_team_invite: { teamId: team.id, inviteeId: invitee.id } },
  });
  if (existingInvite && existingInvite.status === "pending") {
    return NextResponse.json({ error: "Приглашение уже отправлено" }, { status: 409 });
  }

  // Create or re-activate invitation
  const invitation = await prisma.teamInvitation.upsert({
    where: { unique_team_invite: { teamId: team.id, inviteeId: invitee.id } },
    create: { teamId: team.id, inviterId: session.user.id, inviteeId: invitee.id, status: "pending" },
    update: { status: "pending", inviterId: session.user.id },
  });

  return NextResponse.json({ invitationId: invitation.id, invitee: { name: invitee.name, email: invitee.email } });
}

// PUT /api/team/invite — accept or reject invitation
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(respondInviteSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { invitationId, action } = parsed.data;

  const invitation = await prisma.teamInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.inviteeId !== session.user.id) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "Invitation already processed" }, { status: 400 });
  }

  if (action === "reject") {
    await prisma.teamInvitation.update({ where: { id: invitationId }, data: { status: "rejected" } });
    return NextResponse.json({ status: "rejected" });
  }

  // Accept: create membership + update invitation
  await prisma.$transaction([
    prisma.teamMember.create({ data: { teamId: invitation.teamId, userId: session.user.id, role: "member" } }),
    prisma.teamInvitation.update({ where: { id: invitationId }, data: { status: "accepted" } }),
  ]);

  return NextResponse.json({ status: "accepted" });
}

// DELETE /api/team/invite — remove member or cancel invitation
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(removeMemberSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { memberId, invitationId } = parsed.data;

  // Check admin rights
  const isAdmin = await prisma.teamMember.findFirst({
    where: { userId: session.user.id, role: "admin" },
  }) || await prisma.team.findFirst({ where: { ownerId: session.user.id } });

  if (!isAdmin) {
    return NextResponse.json({ error: "Only team admin can remove members" }, { status: 403 });
  }

  if (memberId) {
    await prisma.teamMember.delete({ where: { id: memberId } });
    return NextResponse.json({ removed: true });
  }

  if (invitationId) {
    await prisma.teamInvitation.delete({ where: { id: invitationId } });
    return NextResponse.json({ cancelled: true });
  }

  return NextResponse.json({ error: "memberId or invitationId required" }, { status: 400 });
}
