"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import { Plus, Layers } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Layer {
  link_id: string;
  dataset_title: string;
  dataset_type: string;
  category: string;
  subcategory: string | null;
}

export default function InstancePage() {
  const params = useParams();
  const id = params?.id as string;

  const [instance, setInstance] = useState<any>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("id, title, type, country_iso, created_at")
      .eq("id", id)
      .single();
    if (!error) setInstance(data);
  };

  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", id);
    if (!error) setLayers(data || []);
  };

  useEffect(() => {
    fetchInstance();
    fetchLayers();
  }, [id]);

  const headerProps = {
    title: instance ? instance.title : "Instance",
    group: "country-config" as const,
    description: "Configure and preview instance layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: instance?.country_iso || "Instance" },
          { label: instance?.title || "Details" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
          Layers
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[color:var(--gsc-green)] text-white text-sm rounded hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
      </div>

      <div className="border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2 w-[30%]">Dataset</th>
              <th className="px-3 py-2 w-[20%]">Category</th>
              <th className="px-3 py-2 w-[15%]">Type</th>
              <th className="px-3 py-2 w-[20%]">Subcategory</th>
              <th className="px-3 py-2 w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.link_id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{l.dataset_title}</td>
                <td className="px-3 py-2 capitalize">
                  {l.category.replace("_", " ")}
                </td>
                <td className="px-3 py-2">{l.dataset_type}</td>
                <td className="px-3 py-2">{l.subcategory || "—"}</td>
                <td className="px-3 py-2 text-right text-gray-400 italic">
                  linked
                </td>
              </tr>
            ))}
            {!layers.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-gray-500 italic"
                >
                  No layers added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Composite preview */}
      <div className="mt-6">
        <CompositePreview
          instanceId={id}
          category="underlying_vulnerability"
        />
      </div>

      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={id}
          onAdded={async () => {
            await fetchLayers();
            setShowAdd(false);
          }}
        />
      )}
    </SidebarLayout>
  );
}
