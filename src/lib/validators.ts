import { z } from "zod";

// ── Auth ──
export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export const resendVerifySchema = z.object({
  email: z.string().email().max(255),
});

// ── User ──
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  image: z.union([z.string().max(14000000), z.null()]).optional(),
});

// ── Universes ──
export const createUniverseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  visibility: z.enum(["private", "link", "public"]).optional(),
  templateId: z.string().max(50).optional(),
});

export const updateUniverseSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  visibility: z.enum(["private", "link", "public"]).optional(),
  license: z.enum(["none", "open", "paid"]).optional(),
  price: z.number().int().min(0).max(1000000).optional(),
  listedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const deleteUniverseSchema = z.object({
  id: z.string().cuid(),
});

// ── Entities ──
export const createEntitySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  universeId: z.string().cuid(),
  groupId: z.string().cuid().nullable().optional(),
  description: z.string().max(10000).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  notes: z.array(z.union([z.string(), z.object({ title: z.string(), content: z.string() })])).optional(),
  date: z.string().max(100).optional(),
  imageUrl: z.string().max(14000000).optional(),
  position: z.number().optional(),
  parentId: z.string().cuid().nullable().optional(),
});

export const updateEntitySchema = createEntitySchema.extend({
  id: z.string().cuid(),
});

export const deleteEntitySchema = z.object({
  id: z.string().cuid(),
});

// ── Groups ──
export const createGroupSchema = z.object({
  universeId: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().min(1).max(50).optional(),
  fields: z.array(z.string().max(50)).max(20).optional(),
  isContainer: z.boolean().optional(),
});

export const updateGroupSchema = createGroupSchema.extend({
  id: z.string().cuid(),
});

// ── Relations ──
export const createRelationSchema = z.object({
  sourceId: z.string().cuid(),
  targetId: z.string().cuid(),
  label: z.string().min(1).max(200),
  universeId: z.string().cuid(),
});

// ── Team ──
export const inviteTeamSchema = z.object({
  email: z.string().email().max(255),
});

export const respondInviteSchema = z.object({
  invitationId: z.string().cuid(),
  action: z.enum(["accept", "reject"]),
});

export const removeMemberSchema = z.object({
  memberId: z.string().cuid().optional(),
  invitationId: z.string().cuid().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

// ── Subscription ──
export const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "pro", "corporate"]),
});

export const checkoutSchema = z.object({
  planId: z.enum(["pro", "corporate"]),
});

export const buyCreditsSchema = z.object({
  packId: z.enum(["small", "medium", "large"]),
  qty: z.number().int().min(1).max(10).optional(),
});

export const walletTopupSchema = z.object({
  amount: z.number().int().min(100).max(50000),
});

// ── AI ──
export const generateTextSchema = z.object({
  type: z.enum(["scenario", "suggestion", "edit", "expand"]),
  prompt: z.string().min(1).max(5000),
  context: z.string().max(10000).optional(),
});

export const generateEntitiesSchema = z.object({
  prompt: z.string().max(5000).optional(),
  universeId: z.string().cuid(),
  context: z.string().max(10000).optional(),
  targetGroupId: z.string().cuid().nullable().optional(),
  count: z.number().int().min(1).max(10).optional(),
});

export const confirmEntitiesSchema = z.object({
  universeId: z.string().cuid(),
  entities: z.array(z.object({
    name: z.string().min(1).max(200),
    type: z.string().min(1).max(100),
    description: z.string().max(10000).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    notes: z.array(z.union([z.string(), z.object({ title: z.string(), content: z.string() })])).optional(),
    date: z.string().max(100).nullable().optional(),
    _link: z.string().max(200).optional(),
  })).min(1).max(10),
  relations: z.array(z.object({
    sourceIndex: z.number().int().min(0),
    targetIndex: z.number().int().min(0),
    label: z.string().min(1).max(200),
  })).max(50).optional(),
  targetGroupId: z.string().cuid().nullable().optional(),
});

export const generateGroupsSchema = z.object({
  prompt: z.string().min(1).max(5000),
  universeId: z.string().cuid(),
  existingGroups: z.array(z.object({
    name: z.string().max(100),
    slug: z.string().max(100),
    fields: z.array(z.string()),
  })).optional(),
});

export const confirmGroupsSchema = z.object({
  universeId: z.string().cuid(),
  groups: z.array(z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.string().min(1).max(50),
    fields: z.array(z.string().max(50)).max(20),
  })).min(1).max(20),
});

export const editEntitySchema = z.object({
  entityId: z.string().cuid(),
  instruction: z.string().min(1).max(5000),
});

export const improvePromptSchema = z.object({
  prompt: z.string().min(1).max(5000),
  context: z.string().max(10000).optional(),
});

export const generateImageSchema = z.object({
  prompt: z.string().max(5000).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
  context: z.string().max(10000).optional(),
  entityName: z.string().max(200).optional(),
  entityDescription: z.string().max(5000).optional(),
});

export const translateSchema = z.object({
  targetLang: z.string().min(2).max(10),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  fields: z.record(z.string(), z.string()).optional(),
  fieldNames: z.array(z.string()).optional(),
});

export const createTimelineScaleSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  universeId: z.string().cuid(),
  eras: z.array(z.object({
    name: z.string().min(1).max(200),
    abbreviation: z.string().min(1).max(20),
    direction: z.enum(["forward", "backward"]),
    offset: z.number(),
  })).min(1),
  isDefault: z.boolean().optional(),
});

export const updateTimelineScaleSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  eras: z.array(z.object({
    name: z.string().min(1).max(200),
    abbreviation: z.string().min(1).max(20),
    direction: z.enum(["forward", "backward"]),
    offset: z.number(),
  })).min(1).optional(),
  isDefault: z.boolean().optional(),
});

// ── Helper ──
export function validateBody<T extends z.ZodType>(schema: T, body: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
