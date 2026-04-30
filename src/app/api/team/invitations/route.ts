import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/team/invitations — get pending invitations for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await prisma.teamInvitation.findMany({
    where: { inviteeId: session.user.id, status: "pending" },
    include: { team: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    invitations: invitations.map(inv => ({
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.team.name,
    })),
  });
}
