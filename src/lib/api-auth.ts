import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Check if the current user can modify a universe (owner or team member).
 * Returns the session if authorized, null otherwise.
 */
export async function canModifyUniverse(universeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    select: { userId: true, teamId: true },
  });
  if (!universe) return null;

  // Direct owner
  if (universe.userId === session.user.id) return session;

  // Team member (corporate plan)
  if (universe.teamId) {
    const isMember = await prisma.teamMember.findFirst({
      where: { teamId: universe.teamId, userId: session.user.id },
    });
    if (isMember) return session;

    const isOwner = await prisma.team.findFirst({
      where: { id: universe.teamId, ownerId: session.user.id },
    });
    if (isOwner) return session;
  }

  return null;
}

/**
 * Check if the current user can modify an entity (via its universe).
 * Returns the session if authorized, null otherwise.
 */
export async function canModifyEntity(entityId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { universe: { select: { userId: true, teamId: true } } },
  });
  if (!entity) return null;

  // Direct owner
  if (entity.universe.userId === session.user.id) return session;

  // Team member
  if (entity.universe.teamId) {
    const isMember = await prisma.teamMember.findFirst({
      where: { teamId: entity.universe.teamId, userId: session.user.id },
    });
    if (isMember) return session;

    const isOwner = await prisma.team.findFirst({
      where: { id: entity.universe.teamId, ownerId: session.user.id },
    });
    if (isOwner) return session;
  }

  return null;
}
