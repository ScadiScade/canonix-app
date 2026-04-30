import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, confirmEntitiesSchema } from "@/lib/validators";

// POST /api/ai/confirm-entities — save confirmed AI-generated entities + relations to DB
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(confirmEntitiesSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId, entities, relations, targetGroupId } = parsed.data;

  // Verify ownership + fetch existing entities and groups
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: { entities: true, groups: true },
  });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Map group slug → groupId for auto-assignment
  const groupBySlug: Record<string, string> = {};
  for (const g of universe.groups) {
    groupBySlug[g.slug] = g.id;
  }

  // Map existing entity names to ids for _link resolution
  const existingByName: Record<string, string> = {};
  for (const e of universe.entities) {
    existingByName[e.name.toLowerCase()] = e.id;
  }

  // Create relations to existing entities via _link hints
  const linkRelations: Array<{ id: string; sourceId: string; targetId: string; label: string; universeId: string; source: Record<string, unknown>; target: Record<string, unknown> }> = [];

  // Create entities and track their DB ids (index → id)
  const idMap: Record<number, string> = {};
  const createdEntities = [];

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    // Extract _link before saving (it's a hint for relations, not a real customField)
    const fields = { ...(e.customFields || {}) };
    const linkName = fields._link as string | undefined;
    delete fields._link;

    const entity = await prisma.entity.create({
      data: {
        name: e.name,
        type: e.type,
        universeId,
        groupId: targetGroupId || groupBySlug[e.type] || null,
        description: e.description || null,
        date: e.date || null,
        customFields: JSON.stringify(fields),
        notes: JSON.stringify(e.notes || []),
      },
    });
    idMap[i] = entity.id;
    createdEntities.push(entity);

    // Create relation to existing entity if _link was specified
    if (linkName) {
      const existingId = existingByName[linkName.toLowerCase()];
      if (existingId) {
        const relation = await prisma.relation.create({
          data: { sourceId: entity.id, targetId: existingId, label: "связан", universeId },
          include: { source: true, target: true },
        });
        // Will be added to linkRelations later
        linkRelations.push(relation);
      }
    }
  }

  // Create relations using DB ids
  const createdRelations = [];
  if (Array.isArray(relations)) {
    for (const r of relations) {
      const sourceId = idMap[r.sourceIndex];
      const targetId = idMap[r.targetIndex];
      if (!sourceId || !targetId) continue;

      const relation = await prisma.relation.create({
        data: { sourceId, targetId, label: r.label, universeId },
        include: { source: true, target: true },
      });
      createdRelations.push(relation);
    }
  }

  return NextResponse.json({
    entities: createdEntities,
    relations: [...createdRelations, ...linkRelations],
  }, { status: 201 });
}
