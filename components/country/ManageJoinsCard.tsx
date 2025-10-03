"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Link as LinkIcon } from "lucide-react";

type Props = { countryIso: string; className?: string };

export default function ManageJoinsCard({ countryIso, className }: Props) {
  const [join, setJoin] = useState<any>(null);

  useEffect(() => {
    const fetchJoin = async () => {
      const { data } = await supabase
        .from("dataset_joins")
        .select(
          "id, admin_datasets(title), population_datasets(title), gis_datasets(title)"
        )
        .eq("country_iso", countryIso)
        .limit(1)
        .single();
      setJoin(data);
    };
    fetchJoin();
  }, [countryIso]);

  return (
    <section className={`border rounded-lg p-5 shadow-sm ${className || ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <LinkIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Manage Joins</h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Link Admin, Population, and GIS datasets together for consistency in analysis.
      </p>
      {join ? (
        <div className="text-sm text-gray-600 mb-3 space-y-1">
          <p><strong>Admin:</strong> {join.admin_datasets?.[0]?.title || "—"}</p>
          <p><strong>Population:</strong> {join.population_datasets?.[0]?.title || "—"}</p>
          <p><strong>GIS:</strong> {join.gis_datasets?.[0]?.title || "—"}</p>
        </div>
      ) : (
        <p className="italic text-gray-400 mb-3">No join configured</p>
      )}
      <a
        href={`/country/${countryIso}/joins`}
        className="bg-blue-700 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
      >
        Manage
      </a>
    </section>
  );
}
