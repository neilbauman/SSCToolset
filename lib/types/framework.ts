export type UUID = string;

export type PillarCatalogue = {
  id: UUID;
  name: string;
  description: string | null;
};

export type ThemeCatalogue = {
  id: UUID;
  pillar_id: UUID;
  name: string;
  description: string | null;
};

export type SubthemeCatalogue = {
  id: UUID;
  theme_id: UUID;
  name: string;
  description: string | null;
};

export type FrameworkVersion = {
  id: UUID;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

export type FrameworkVersionItem = {
  id: UUID;
  version_id: UUID;
  pillar_id: UUID | null;
  theme_id: UUID | null;
  subtheme_id: UUID | null;
  ref_code: string;
  sort_order: number;
};

export type VersionTreeNode = {
  pillar: PillarCatalogue;
  themes: Array<{
    theme: ThemeCatalogue;
    subthemes: SubthemeCatalogue[];
  }>;
};
