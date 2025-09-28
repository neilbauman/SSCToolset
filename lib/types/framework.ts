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
  can_have_indicators?: boolean; // NEW: matches DB column
};

export type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  pillar: FrameworkEntity | null;
  theme: FrameworkEntity | null;
  subtheme: FrameworkEntity | null;
};

export type NormalizedFramework = {
  id: string;
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean; // NEW
  sort_order?: number;
  themes: {
    id: string;
    name: string;
    description: string;
    color: string | null;
    icon: string | null;
    can_have_indicators?: boolean; // NEW
    sort_order?: number;
    subthemes: {
      id: string;
      name: string;
      description: string;
      color: string | null;
      icon: string | null;
      can_have_indicators?: boolean; // NEW
      sort_order?: number;
    }[];
  }[];
};
