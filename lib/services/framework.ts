// lib/services/framework.ts
import { supabaseServer } from "@/lib/supabase";
import type {
  FrameworkVersion,
  NormalizedFramework,
} from "@/lib/types/framework";

// ─────────────────────────────────────────────
// Framework Versions
// ─────────────────────────────────────────────
export async function listVersions(): Promise<FrameworkVersion[]> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .select("id, name, status, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as FrameworkVersion[];
}

export async function createVersion(name: string): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .insert({ name, status: "draft" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
}

export async function cloneVersion(fromVersionId: string, newName: string) {
  const { data, error } = await supabaseServer.rpc("clone_framework_version", {
    v_from_version_id: fromVersionId,
    v_new_name: newName,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function publishVersion(
  versionId: string,
  publish: boolean
): Promise<FrameworkVersion> {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update({ status: publish ? "published" : "draft" })
    .eq("id", versionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FrameworkVersion;
}

export async function updateVersion(
  id: string,
  patch: { name?: string; status?: string }
) {
  const { data, error } = await supabaseServer
    .from("framework_versions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVersion(id: string) {
  const { error } = await supabaseServer
    .from("framework_versions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// Framework Items (Tree Loader via RPC)
// ─────────────────────────────────────────────
export async function getVersionTree(versionId: string) {
  const { data, error } = await supabaseServer.rpc("get_framework_tree", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data as NormalizedFramework[];
}

// ─────────────────────────────────────────────
// Catalogue: Pillars
// ─────────────────────────────────────────────
export async function listPillarCatalogue(versionId: string) {
  const { data, error } = await supabaseServer.rpc("list_pillar_catalogue", {
    v_version_id: versionId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createPillar(name: string, description?: string) {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePillar(
  id: string,
  patch: { name?: string; description?: string }
) {
  const { data, error } = await supabaseServer
    .from("pillar_catalogue")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePillar(id: string) {
  const { error } = await supabaseServer
    .from("pillar_catalogue")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
