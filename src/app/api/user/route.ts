import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invalidateImageCache } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, updateUserSchema } from "@/lib/validators";

// GET /api/user — current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      bio: true,
      email: true,
      image: true,
      createdAt: true,
      _count: { select: { universes: true } },
    },
  });

  return NextResponse.json(user);
}

// PUT /api/user — update profile
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(updateUserSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, bio, image } = parsed.data;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image }),
    },
    select: { id: true, name: true, bio: true, email: true, image: true },
  });

  if (image !== undefined) invalidateImageCache(session.user.id);

  return NextResponse.json(user);
}

// DELETE /api/user — delete account and all associated data
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cascade deletes: universes → entities/relations, accounts, sessions
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
