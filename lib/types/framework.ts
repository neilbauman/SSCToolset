export type FrameworkVersion = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at?: string | null;
};

export type FrameworkEntity = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
};

export type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  pillar?: FrameworkEntity | null;
  theme?: FrameworkEntity | null;
  subtheme?: FrameworkEntity | null;
};

export type NormalizedFramework = FrameworkEntity & {
  themes: (FrameworkEntity & {
    subthemes: FrameworkEntity[];
  })[];
};
