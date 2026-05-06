import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/import — import universe from JSON
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid import data" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const description = typeof data.description === "string" ? data.description : null;

  // Generate slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim() || `import-${Date.now()}`;
  const existing = await prisma.universe.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

  // Parse groups
  const rawGroups = Array.isArray(data.groups) ? data.groups : [];
  const groupIdMap = new Map<string, string>();

  const universe = await prisma.universe.create({
    data: {
      name,
      slug,
      description,
      visibility: "private",
      userId: session.user.id,
      ...(rawGroups.length > 0 && {
        groups: {
          createMany: {
            data: rawGroups.map((g: Record<string, unknown>) => ({
              name: String(g.name || "Group"),
              slug: String(g.slug || "group").toLowerCase().replace(/[^a-z0-9-]/g, "-") || "group",
              color: typeof g.color === "string" && /^#[0-9a-fA-F]{6}$/.test(g.color) ? g.color : "#78716C",
              icon: typeof g.icon === "string" ? g.icon : "Tag",
              fields: typeof g.fields === "string" ? g.fields : JSON.stringify(Array.isArray(g.fields) ? g.fields : []),
              isContainer: g.isContainer === true,
            })),
          },
        },
      }),
    },
    include: { groups: true },
  });

  // Build group ID mapping (old id → new id, by index)
  rawGroups.forEach((g: Record<string, unknown>, i: number) => {
    const newGroup = universe.groups[i];
    if (newGroup && typeof g.id === "string") groupIdMap.set(g.id, newGroup.id);
  });

  // Also map slug → new group id for entities that reference by type
  universe.groups.forEach(g => groupIdMap.set(g.slug, g.id));

  // Parse entities
  const rawEntities = Array.isArray(data.entities) ? data.entities : [];
  const entityIdMap = new Map<string, string>();

  for (const e of rawEntities) {
    const ent = e as Record<string, unknown>;
    const entityName = String(ent.name || "Untitled");
    const entityType = String(ent.type || "other");
    const oldGroupId = typeof ent.groupId === "string" ? ent.groupId : null;

    const newEntity = await prisma.entity.create({
      data: {
        name: entityName,
        type: entityType,
        universeId: universe.id,
        groupId: oldGroupId ? (groupIdMap.get(oldGroupId) || null) : null,
        description: typeof ent.description === "string" ? ent.description : null,
        customFields: typeof ent.customFields === "string"
          ? ent.customFields
          : JSON.stringify(ent.customFields || {}),
        notes: typeof ent.notes === "string"
          ? ent.notes
          : JSON.stringify(ent.notes || []),
        date: typeof ent.date === "string" ? ent.date : null,
        imageUrl: typeof ent.imageUrl === "string" ? ent.imageUrl : null,
        position: typeof ent.position === "number" ? ent.position : 0,
      },
    });

    if (typeof ent.id === "string") entityIdMap.set(ent.id, newEntity.id);
  }

  // Set parent relationships (second pass)
  for (const e of rawEntities) {
    const ent = e as Record<string, unknown>;
    if (typeof ent.parentId === "string" && typeof ent.id === "string") {
      const newEntityId = entityIdMap.get(ent.id as string);
      const newParentId = entityIdMap.get(ent.parentId);
      if (newEntityId && newParentId) {
        await prisma.entity.update({
          where: { id: newEntityId },
          data: { parentId: newParentId },
        });
      }
    }
  }

  // Parse relations
  const rawRelations = Array.isArray(data.relations) ? data.relations : [];
  for (const r of rawRelations) {
    const rel = r as Record<string, unknown>;
    const newSourceId = entityIdMap.get(String(rel.sourceId || ""));
    const newTargetId = entityIdMap.get(String(rel.targetId || ""));
    const label = String(rel.label || "related");
    if (newSourceId && newTargetId) {
      await prisma.relation.create({
        data: { sourceId: newSourceId, targetId: newTargetId, label, universeId: universe.id },
      });
    }
  }

  return NextResponse.json(universe, { status: 201 });
}
