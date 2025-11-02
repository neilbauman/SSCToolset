"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Beaker, Activity } from "lucide-react";

interface Props {
  instanceId: string;
}

interface Layer {
  link_id: string;
  dataset_title: string;
  category: string;
  methodology_name: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  underlying_vulnerability: "Underlying Vulnerability",
  hazard: "Hazards",
  ssc_pillar_p1: "SSC Pillar P1",
  ssc_pillar_p2: "SSC Pillar P2",
  ssc_pillar_p3: "SSC Pillar P3",
};

export default function CompositePreview({ instanceId }: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLayers = async () => {
    if (!instanceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("instance_layer_summary")
        .select("*")
        .eq("instance_id", instanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLayers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, [instanceId]);

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Beaker className="w-5 h-5 text-green-600" />
        Composite Overview
      </h3>

      {loading ? (
        <div className="flex justify-center items-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map((categoryKey) => {
            const catLayers = layers.filter((l) => l.category === categoryKey);
            const label = CATEGORY_LABELS[categoryKey];

            return (
              <div
                key={categoryKey}
                className="border rounded-lg bg-white shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <h4 className="font-medium text-sm text-gray-700">{label}</h4>
                  {catLayers.length > 0 && (
                    <button
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      onClick={() => alert(`Methodology applied for ${label}`)}
                    >
                      <Activity className="w-3 h-3" />
                      Apply Methodology
                    </button>
                  )}
                </div>

                {catLayers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 italic">
                    No datasets added.
                  </div>
                ) : (
                  <ul className="divide-y text-sm">
                    {catLayers.map((layer) => (
                      <li key={layer.link_id} className="p-3 hover:bg-gray-50">
                        <div className="font-medium text-gray-800">
                          {layer.dataset_title}
                        </div>
                        <div className="text-xs text-gray-500">
                          Methodology:{" "}
                          {layer.methodology_name || (
                            <span className="italic">None</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
