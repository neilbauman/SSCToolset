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
  can_have_indicators?: boolean; // matches DB column
};

export type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  ref_code?: string; // added for UI
  pillar: FrameworkEntity | null;
  theme: FrameworkEntity | null;
  subtheme: FrameworkEntity | null;
};

export type NormalizedFramework = {
  id: string;
  type: "pillar" | "theme" | "subtheme";
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
  sort_order?: number;
  ref_code?: string; // ✅ ensure this exists for UI rendering
  themes?: NormalizedFramework[];
  subthemes?: NormalizedFramework[];
};
