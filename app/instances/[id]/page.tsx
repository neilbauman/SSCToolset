"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import { Plus, Layers, RefreshCw } from "lucide-react";
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

  // Load methodologies from DB
  const fetchMethodologies = async () => {
    const { data, error } = await supabase.from("methodologies").select("id, name");
    if (error) console.error(error);
    else setMethodologies(data || []);
  };

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

  // Update methodology
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

  // Apply selected methodology to a layer
  const handleRecompute = async (layerId: string) => {
    const { data, error } = await supabase.rpc("apply_methodology_to_layer", { p_layer_id: layerId });
    if (error) {
      alert("Error applying methodology: " + error.message);
    } else {
      alert(data?.[0] || "Methodology applied successfully.");
    }
  };

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const,
    description: "Link datasets to define this instance’s analytical layers.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

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
                <td className="px-4 py-2">{layer.category}</td>
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
                    onClick={() => handleRecompute(layer.link_id)}
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

      {layers.some((l) => l.category === "underlying_vulnerability") && (
        <CompositePreview instanceId={instanceId as string} category="underlying_vulnerability" />
      )}

      <AddLayerModal open={showAdd} onClose={() => setShowAdd(false)} instanceId={instanceId as string} />
    </SidebarLayout>
  );
}
