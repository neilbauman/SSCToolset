// lib/types/framework.ts

// ─────────────────────────────────────────────
// Framework Versions
// ─────────────────────────────────────────────
export type FrameworkVersion = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at?: string;
  created_by?: string;
};

// ─────────────────────────────────────────────
// Framework Entities (from catalogue tables)
// ─────────────────────────────────────────────
export type FrameworkEntity = {
  id: string;
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
};

// ─────────────────────────────────────────────
// Framework Version Items (DB rows)
// ─────────────────────────────────────────────
export type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  ref_code: string; // always populated when normalized
  pillar: FrameworkEntity | null;
  theme: FrameworkEntity | null;
  subtheme: FrameworkEntity | null;
};

// ─────────────────────────────────────────────
// Normalized Framework Tree
// ─────────────────────────────────────────────
export type NormalizedFramework = {
  id: string;
  type: "pillar" | "theme" | "subtheme";
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
  sort_order: number;
  ref_code: string;
  // Children
  themes?: NormalizedFramework[];
  subthemes?: NormalizedFramework[];
};

// ─────────────────────────────────────────────
// Catalogue Types
// ─────────────────────────────────────────────
export type CataloguePillar = {
  id: string;
  name: string;
  description?: string;
  can_have_indicators?: boolean;
  sort_order?: number;
};

export type CatalogueTheme = {
  id: string;
  pillar_id: string;
  name: string;
  description?: string;
  can_have_indicators?: boolean;
  sort_order?: number;
};

export type CatalogueSubtheme = {
  id: string;
  theme_id: string;
  name: string;
  description?: string;
  can_have_indicators?: boolean;
  sort_order?: number;
};

// ─────────────────────────────────────────────
// Editor Support Types
// ─────────────────────────────────────────────
export type FrameworkNodeType = "pillar" | "theme" | "subtheme";

export type FrameworkAction =
  | { type: "add"; parentId?: string; node: NormalizedFramework }
  | { type: "update"; node: NormalizedFramework }
  | { type: "delete"; id: string; nodeType: FrameworkNodeType }
  | { type: "move"; id: string; newParentId?: string; newSortOrder: number };
