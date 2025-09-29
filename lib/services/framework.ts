import { supabaseBrowser } from "@/lib/supabase";
import { FrameworkVersion } from "@/lib/types/framework";

// ─────────────────────────────────────────────
// List all versions
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

// ─────────────────────────────────────────────
// Create a new version (empty draft)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Edit (rename) a version
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Delete a version (only if safe to do so)
// ─────────────────────────────────────────────
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
// Publish a version (set status → published)
// ─────────────────────────────────────────────
export async function publishVersion(id: string): Promise<boolean> {
  const { error } = await supabaseBrowser
    .from("framework_versions")
    .update({ status: "published" })
    .eq("id", id);

  if (error) {
    console.error("Error publishing version:", error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// Clone a version
//   ⚠ Needs DB function (recommended: RPC that
//   copies framework_version_items & returns new id)
// ─────────────────────────────────────────────
export async function cloneVersion(id: string, newName: string): Promise<FrameworkVersion | null> {
  // If you already have a Supabase RPC (e.g. clone_framework_version)
  const { data, error } = await supabaseBrowser.rpc("clone_framework_version", {
    from_version_id: id,
    new_name: newName,
  });

  if (error) {
    console.error("Error cloning version:", error.message);
    return null;
  }

  return data as FrameworkVersion;
}
