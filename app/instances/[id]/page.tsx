"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import { Plus, RefreshCw, Layers } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Layer {
  link_id: string;
  dataset_title: string;
  dataset_type: string;
  category: string;
  subcategory: string | null;
  methodology_id?: string | null;
  methodology_name?: string | null;
}

export default function InstanceDetailPage() {
  const { id: instanceId } = useParams();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [methodologies, setMethodologies] = useState<{ id: string; name: string }[]>([]);
  const [processingAll, setProcessingAll] = useState(false);

  // Fetch methodologies
  const fetchMethodologies = async () => {
    const { data, error } = await supabase.from("methodologies").select("id, name");
    if (error) console.error(error);
    else setMethodologies(data || []);
  };

  // Fetch instance layers
  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    if (error) setError(error.message);
    else setLayers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMethodologies();
    fetchLayers();
  }, [instanceId]);

  // Update methodology assignment
  const handleMethodChange = async (layerId: string, methodologyId: string) => {
    const { error } = await supabase
      .from("instance_layers")
      .update({ methodology_id: methodologyId })
      .eq("id", layerId);
    if (error) {
      alert("Error updating methodology: " + error.message);
    } else {
      fetchLayers();
    }
  };

  // Apply methodology to a single layer
  const handleRecomputeLayer = async (layerId: string) => {
    const { data, error } = await supabase.rpc("apply_methodology_to_layer", {
      p_layer_id: layerId,
    });
    if (error) alert("Error applying methodology: " + error.message);
    else alert(data?.[0] || "Layer recomputed successfully.");
  };

  // Recompute a single category composite
  const handleRecomputeCategory = async (category: string) => {
    const { data, error } = await supabase.rpc("apply_weight", {
      p_instance_id: instanceId,
      p_category: category,
    });
    if (error) alert("Error recomputing composite: " + error.message);
    else alert(data?.[0] || `Composite for ${category} recomputed successfully.`);
  };

  // Recompute ALL categories (all composites)
  const handleRecomputeAll = async () => {
    setProcessingAll(true);
    try {
      const uniqueCategories = Array.from(new Set(layers.map((l) => l.category)));
      for (const category of uniqueCategories) {
        const { data, error } = await supabase.rpc("apply_weight", {
          p_instance_id: instanceId,
          p_category: category,
        });
        if (error) throw error;
        console.log(`✅ Recomputed ${category}:`, data);
      }
      alert("All category composites recomputed successfully!");
    } catch (err: any) {
      alert("Error recomputing all composites: " + err.message);
    } finally {
      setProcessingAll(false);
    }
  };

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const,
    description: "Link datasets and methodologies to define this instance’s analytical layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: "PHL", href: "/country/PHL" },
          { label: "Instances", href: `/country/PHL/instances` },
          { label: "Instance" },
        ]}
      />
    ),
  };

  const uniqueCategories = Array.from(new Set(layers.map((l) => l.category)));

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Add Dataset
          </button>

          <button
            onClick={handleRecomputeAll}
            disabled={processingAll}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm text-white ${
              processingAll ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Layers className="w-4 h-4" />
            {processingAll ? "Processing..." : "Recompute All Layers"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      {/* Layers Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Subcategory</th>
              <th className="px-4 py-2">Methodology</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.link_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{layer.dataset_title}</td>
                <td className="px-4 py-2 capitalize">{layer.category}</td>
                <td className="px-4 py-2">{layer.dataset_type}</td>
                <td className="px-4 py-2">{layer.subcategory || "—"}</td>
                <td className="px-4 py-2">
                  <select
                    value={layer.methodology_id || ""}
                    onChange={(e) => handleMethodChange(layer.link_id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">— Select Method —</option>
                    {methodologies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleRecomputeLayer(layer.link_id)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> Recompute
                  </button>
                </td>
              </tr>
            ))}
            {layers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 italic py-6">
                  No datasets linked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Category-wise Composite Previews */}
      {uniqueCategories.map((category) => (
        <div key={category} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold capitalize">
              Composite Preview — {category.replaceAll("_", " ")}
            </h2>
            <button
              onClick={() => handleRecomputeCategory(category)}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" /> Recompute Composite
            </button>
          </div>
          <CompositePreview instanceId={instanceId as string} category={category} />
        </div>
      ))}

      <AddLayerModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={fetchLayers}
        instanceId={instanceId as string}
      />
    </SidebarLayout>
  );
}
