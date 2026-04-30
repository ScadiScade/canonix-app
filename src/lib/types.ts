// Entity type is now dynamic — a string slug referencing an EntityGroup
export type EntityType = string;

export interface CustomFields {
  [key: string]: string;
}

export interface Note {
  title: string;
  content: string;
}

// A group definition (from DB or defaults)
export interface EntityGroupData {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  fields: string[]; // field names like ["Раса", "Пол", "Рост"]
  isContainer?: boolean; // If true, entities of this group can contain other entities
}

// Timeline era definition
export interface TimelineEra {
  name: string;        // "До Битвы при Явине"
  abbreviation: string; // "ДБЯ" / "BBY"
  direction: "forward" | "backward"; // backward = numbers decrease toward 0, forward = numbers increase
  offset: number;      // offset from epoch (for multi-era scales)
}

// A timeline scale definition
export interface TimelineScaleData {
  id: string;
  name: string;
  slug: string;
  eras: TimelineEra[];
  isDefault: boolean;
}

// Default groups are no longer auto-created — users create their own via AI or manually
export const DEFAULT_GROUPS: Omit<EntityGroupData, "id">[] = [];

// Backwards-compatible lookups (fallback when groups not loaded)
export const ENTITY_TYPE_LABELS: Record<string, string> = {};
export const ENTITY_TYPE_COLORS: Record<string, string> = {};
export const ENTITY_TYPE_ICONS: Record<string, string> = {};

// Resolve group info from loaded groups, with generic fallback
export function resolveGroup(type: string, groups: EntityGroupData[]): EntityGroupData {
  const g = groups.find(gr => gr.slug === type);
  if (g) return g;
  return { id: "", slug: type, name: type, color: "#78716C", icon: "Tag", fields: [] };
}

export function getFieldsForType(type: string, groups: EntityGroupData[] = []): string[] {
  return resolveGroup(type, groups).fields;
}
