import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/marketplace — list all listed universes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const license = searchParams.get("license"); // "open" | "paid" | null (all)
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    listedAt: { not: null },
    visibility: "public",
  };

  if (license) where.license = license;
  if (search) where.name = { contains: search };

  const universes = await prisma.universe.findMany({
    where,
    include: {
      user: { select: { name: true } },
      _count: { select: { entities: true, relations: true } },
    },
    orderBy: { listedAt: "desc" },
  });

  return NextResponse.json(universes);
}
