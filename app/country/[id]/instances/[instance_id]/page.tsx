"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Layers, Plus, Trash2, BarChart3, RefreshCw } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

interface Instance {
  id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
}

interface LayerLink {
  link_id: string;
  category: string;
  subcategory: string | null;
  dataset_title: string;
  dataset_type: string;
  data_type: string;
  admin_level: string;
}

export default function InstanceDetailPage({ params }: { params: { id: string; instance_id: string } }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;
  const [instance, setInstance] = useState<Instance | null>(null);
  const [linkedLayers, setLinkedLayers] = useState<LayerLink[]>([]);
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([]);
  const [category, setCategory] = useState("vulnerability");
  const [subcategory, setSubcategory] = useState("P1");
  const [datasetId, setDatasetId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Load instance details
  async function loadInstance() {
    const { data } = await supabase.from("instances_list").select("*").eq("id", instanceId).single();
    if (data) setInstance(data);
  }

  // Load linked datasets
  async function loadLinkedLayers() {
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    if (error) console.error(error);
    else setLinkedLayers(data || []);
  }

  // Load available datasets for linking
  async function loadDatasets() {
    const { data, error } = await supabase
      .from("unified_datasets")
      .select("dataset_id, dataset_title, dataset_type, data_type, admin_level, country_iso")
      .eq("country_iso", countryIso);
    if (error) console.error(error);
    else setAvailableDatasets(data || []);
  }

  useEffect(() => {
    loadInstance();
    loadLinkedLayers();
    loadDatasets();
  }, [countryIso, instanceId]);

  // Add a dataset link
  async function addLayer() {
    if (!datasetId) return alert("Select a dataset to add.");
    const { error } = await supabase.from("instance_layers").insert({
      instance_id: instanceId,
      dataset_id: datasetId,
      category,
      subcategory: category === "ssc_pillar" ? subcategory : null,
    });
    if (error) return alert("Error linking dataset: " + error.message);
    await loadLinkedLayers();
    setDatasetId("");
  }

  // Delete dataset link
  async function deleteLayer(id: string) {
    if (!confirm("Remove this dataset from the instance?")) return;
    const { error } = await supabase.from("instance_layers").delete().eq("id", id);
    if (error) return alert("Error removing layer: " + error.message);
    await loadLinkedLayers();
  }

  const headerProps = {
    title: instance ? instance.title : "Instance Detail",
    group: "country-config" as const,
    description:
      instance?.description ||
      "Link datasets representing vulnerabilities, hazards, and SSC pillars to this instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Instances", href: `/country/${countryIso}/instances` },
          { label: instance?.title || "Instance", href: "#" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Linked Datasets</h2>
          <button
            onClick={() => loadLinkedLayers()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Add dataset */}
        <div className="border rounded-lg p-3 bg-gray-50 flex flex-wrap gap-2 items-center">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="vulnerability">Underlying Vulnerability</option>
            <option value="hazard">Hazard</option>
            <option value="ssc_pillar">SSC Pillar</option>
          </select>

          {category === "ssc_pillar" && (
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="border p-2 rounded text-sm"
            >
              <option value="P1">Pillar 1 – Enclosure</option>
              <option value="P2">Pillar 2 – Domestic Life</option>
              <option value="P3">Pillar 3 – Settlement</option>
            </select>
          )}

          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="border p-2 rounded text-sm flex-1"
          >
            <option value="">Select Dataset</option>
            {availableDatasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.dataset_title} ({d.dataset_type})
              </option>
            ))}
          </select>

          <button
            onClick={addLayer}
            className="flex items-center gap-1 bg-[color:var(--gsc-green)] text-white px-3 py-2 rounded text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Linked datasets table */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Subcategory</th>
                <th className="px-3 py-2 text-left">Dataset</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Level</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linkedLayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center italic text-gray-500 py-3">
                    No datasets linked yet.
                  </td>
                </tr>
              ) : (
                linkedLayers.map((l) => (
                  <tr key={l.link_id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 capitalize">{l.category}</td>
                    <td className="px-3 py-2">{l.subcategory || "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--gsc-blue)] font-medium">
                      {l.dataset_title}
                    </td>
                    <td className="px-3 py-2">{l.dataset_type}</td>
                    <td className="px-3 py-2">{l.admin_level}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/country/${countryIso}/datasets/${l.link_id}`}
                          className="text-gray-700 hover:text-[color:var(--gsc-green)]"
                          title="View dataset"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <button
                          title="Remove link"
                          onClick={() => deleteLayer(l.link_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
