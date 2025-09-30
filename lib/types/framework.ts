// lib/types/framework.ts

export type FrameworkVersion = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at?: string;
  created_by?: string;
};

export type FrameworkEntity = {
  id: string;
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
};

export type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  ref_code?: string;
  pillar: FrameworkEntity | null;
  theme: FrameworkEntity | null;
  subtheme: FrameworkEntity | null;
};

// Normalized in-memory tree format
export type NormalizedFramework = {
  id: string;
  type: "pillar" | "theme" | "subtheme";
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
  sort_order?: number;
  ref_code?: string;
  themes?: NormalizedFramework[];
  subthemes?: NormalizedFramework[];
};

// --- Catalogue-specific types ---
// These map directly to the catalogue tables in Supabase.

export type CataloguePillar = {
  id: string;
  name: string;
  description: string | null;
  can_have_indicators?: boolean;
  sort_order?: number; // default order in catalogue
};

export type CatalogueTheme = {
  id: string;
  pillar_id: string | null;
  name: string;
  description: string | null;
  can_have_indicators?: boolean;
  sort_order?: number;
};

export type CatalogueSubtheme = {
  id: string;
  theme_id: string | null;
  name: string;
  description: string | null;
  can_have_indicators?: boolean;
  sort_order?: number;
};
