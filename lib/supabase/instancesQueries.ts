import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * Load list of instances
 */
export async function fetchInstances() {
  const { data, error } = await supabase
    .from("instances")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Load single instance details
 */
export async function fetchInstance(id: string) {
  const { data, error } = await supabase
    .from("instances")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Load all linked datasets for a given instance.
 * Reads from the view instance_layer_summary.
 */
export async function fetchInstanceLayers(instanceId: string) {
  const { data, error } = await supabase
    .from("instance_layer_summary")
    .select("*")
    .eq("instance_id", instanceId)
    .order("category");
  if (error) throw error;
  return data;
}

/**
 * Add a dataset-layer link to an instance.
 */
export async function addInstanceLayer(instanceId: string, datasetId: string, category: string, subcategory?: string) {
  const { error } = await supabase.from("instance_layers").insert([
    {
      instance_id: instanceId,
      dataset_id: datasetId,
      category,
      subcategory: subcategory || null,
    },
  ]);
  if (error) throw error;
}

/**
 * Delete a dataset-layer link.
 */
export async function deleteInstanceLayer(id: string) {
  const { error } = await supabase.from("instance_layers").delete().eq("id", id);
  if (error) throw error;
}
