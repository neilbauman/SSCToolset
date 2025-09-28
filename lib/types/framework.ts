// lib/types/framework.ts

/** FrameworkVersion
 * Represents a version of the SSC framework.
 */
export type FrameworkVersion = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at?: string;
  created_by?: string;
};

/** FrameworkEntity
 * Base catalogue entity (pillar, theme, subtheme).
 */
export type FrameworkEntity = {
  id: string;
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean; // matches DB column
};

/** FrameworkItem
 * A version-specific item linking to catalogue entities.
 */
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

/** NormalizedFramework
 * Recursive tree structure for rendering frameworks:
 * - Pillars may contain themes
 * - Themes may contain subthemes
 * - Subthemes are leaves
 */
export type NormalizedFramework = {
  id: string;
  name: string;
  description: string;
  color: string | null;
  icon: string | null;
  can_have_indicators?: boolean;
  sort_order?: number;
  ref_code: string; // ✅ Added
  type: "pillar" | "theme" | "subtheme";
  themes?: NormalizedFramework[];    // only present on pillars
  subthemes?: NormalizedFramework[]; // only present on themes
};
