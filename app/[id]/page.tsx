"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";

export default function LegacyInstancePage() {
  const { id } = useParams();
  const instanceId = id as string;

  const [layers, setLayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchLayers = async () => {
    const { data } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    setLayers(data || []);
  };

  useEffect(() => {
    if (instanceId) fetchLayers();
  }, [instanceId]);

  const headerProps = {
    title: "Instance (Legacy)",
    group: "country-config" as const,
    description: "Legacy instance view for backward compatibility.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: "Instance (Legacy)" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Linked Datasets</h3>
        <button
          className="px-3 py-1.5 bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90 text-sm"
          onClick={() => setShowAdd(true)}
        >
          + Add Dataset
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Methodology</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.link_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{l.dataset_title}</td>
                <td className="px-4 py-2">{l.category}</td>
                <td className="px-4 py-2">{l.methodology_name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <CompositePreview instanceId={instanceId} category={"underlying_vulnerability"} />
      </div>

      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={instanceId}
          category={"underlying_vulnerability"}
          onAdded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}
