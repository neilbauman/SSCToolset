import { supabaseBrowser } from "@/lib/supabase";
import { FrameworkEntity, FrameworkItem, FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";

// ─────────────────────────────────────────────
//  VERSION SERVICES
// ─────────────────────────────────────────────
export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error listing versions:", error.message);
    return [];
  }
  return data as FrameworkVersion[];
}

export async function createVersion(name: string): Promise<FrameworkVersion | null> {
  const { data, error } = await supabaseBrowser
    .from("framework_versions")
    .insert([{ name, status: "draft" }])
    .select()
    .single();

  if (error) {
    console.error("Error creating version:", error.message);
    return null;
  }
  return data as FrameworkVersion;
}

export async function updateVersion(id: string, patch: Partial<FrameworkVersion>): Promise<boolean> {
  const { error } = await supabaseBrowser
    .from("framework_versions")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("Error updating version:", error.message);
    return false;
  }
  return true;
}

export async function deleteVersion(id: string): Promise<boolean> {
  const { error } = await supabaseBrowser
    .from("framework_versions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting version:", error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
//  PILLAR CATALOGUE SERVICES
// ─────────────────────────────────────────────
export async function listPillarCatalogue(versionId: string): Promise<(FrameworkEntity & { already_in: boolean })[]> {
  const { data, error } = await supabaseBrowser.rpc("list_pillar_catalogue", {
    version_id: versionId,
  });

  if (error) {
    console.error("Error listing pillar catalogue:", error.message);
    return [];
  }

  return data as (FrameworkEntity & { already_in: boolean })[];
}

export async function createPillar(name: string, description: string): Promise<FrameworkEntity | null> {
  const { data, error } = await supabaseBrowser
    .from("pillar_catalogue")
    .insert([{ name, description }])
    .select()
    .single();

  if (error) {
    console.error("Error creating pillar:", error.message);
    return null;
  }
  return data as FrameworkEntity;
}

// ─────────────────────────────────────────────
//  TREE SERVICES
// ─────────────────────────────────────────────
export async function getVersionTree(versionId: string): Promise<NormalizedFramework[]> {
  const { data, error } = await supabaseBrowser.rpc("get_framework_tree", {
    version_id: versionId,
  });

  if (error) {
    console.error("Error fetching version tree:", error.message);
    return [];
  }

  return data as NormalizedFramework[];
}
