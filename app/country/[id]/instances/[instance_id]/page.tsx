"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus, RefreshCw, Trash2, Layers } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Dataset {
  dataset_id: string;
  title: string;
  dataset_type: string;
  country_iso: string;
  admin_level: string;
  record_count: number;
  is_derived: boolean;
}

interface InstanceDataset {
  id: string;
  dataset_id: string;
  category: string;
  subcategory: string | null;
  created_at: string;
}

export default function InstanceDetailPage({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [availableDatasets, setAvailableDatasets] = useState<Dataset[]>([]);
  const [linkedDatasets, setLinkedDatasets] = useState<InstanceDataset[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [category, setCategory] = useState("vulnerability");
  const [subcategory, setSubcategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Load all datasets
  async function loadAvailable() {
    const { data, error } = await supabase
      .from("unified_datasets")
      .select("dataset_id, title, dataset_type, country_iso, admin_level, record_count, is_derived")
      .eq("country_iso", countryIso);
    if (!error && data) setAvailableDatasets(data);
  }

  // Load datasets linked to this instance
  async function loadLinked() {
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    if (!error && data) setLinkedDatasets(data);
  }

  // Add dataset link
  async function handleAdd() {
    if (!datasetId) return;
    setLoading(true);
    const { error } = await supabase.from("instance_layer_summary").insert([
      {
        instance_id: instanceId,
        dataset_id: datasetId,
        category,
        subcategory: subcategory || null,
      },
    ]);
    setLoading(false);
    if (!error) {
      setDatasetId("");
      setSubcategory("");
      await loadLinked();
    } else {
      console.error(error);
    }
  }

  // Remove dataset link
  async function handleRemove(id: string) {
    const { error } = await supabase
      .from("instance_layer_summary")
      .delete()
      .eq("id", id);
    if (!error) await loadLinked();
  }

  useEffect(() => {
    loadAvailable();
    loadLinked();
  }, [instanceId]);

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const,
    description: "Link datasets to define this instance’s analytical layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Instances", href: `/country/${countryIso}/instances` },
          { label: "Instance", href: "#" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-end">
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="border p-2 rounded text-sm flex-1"
          >
            <option value="">Select Dataset</option>
            {availableDatasets.map((d) => (
              <option
                key={d.dataset_id}
                value={d.dataset_id}
                className={d.is_derived ? "text-blue-600" : ""}
              >
                {d.title} {d.is_derived ? "(Derived)" : ""}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="vulnerability">Vulnerability</option>
            <option value="hazard">Hazard</option>
            <option value="ssc_pillar">SSC Pillar</option>
          </select>

          <input
            type="text"
            placeholder="Subcategory (optional)"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="border p-2 rounded text-sm w-48"
          />

          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>

          <button
            onClick={loadLinked}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-sm hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Linked Datasets */}
        <div className="bg-white border rounded-md shadow-sm text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Dataset</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Subcategory</th>
                <th className="px-3 py-2 text-left">Records</th>
                <th className="px-3 py-2 text-left">Level</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedDatasets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center italic text-gray-500 py-3"
                  >
                    No datasets linked yet.
                  </td>
                </tr>
              ) : (
                linkedDatasets.map((l) => {
                  const ds = availableDatasets.find(
                    (d) => d.dataset_id === l.dataset_id
                  );
                  return (
                    <tr key={l.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {ds?.title || l.dataset_id}
                      </td>
                      <td className="px-3 py-2 capitalize">{l.category}</td>
                      <td className="px-3 py-2">{l.subcategory || "—"}</td>
                      <td className="px-3 py-2">{ds?.record_count || "—"}</td>
                      <td className="px-3 py-2">{ds?.admin_level || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleRemove(l.id)}
                          className="p-1 rounded hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
