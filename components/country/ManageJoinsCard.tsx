"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Link2 } from "lucide-react";
import Link from "next/link";

type ManageJoinsCardProps = {
  countryIso: string;
};

type DatasetJoin = {
  id: string;
  country_iso: string;
  notes?: string;
  admin_datasets?: { title: string; year: number }[];
  population_datasets?: { title: string; year: number }[];
  gis_datasets?: { title: string; year: number }[];
};

export default function ManageJoinsCard({ countryIso }: ManageJoinsCardProps) {
  const [join, setJoin] = useState<DatasetJoin | null>(null);

  useEffect(() => {
    const fetchJoin = async () => {
      const { data, error } = await supabase
        .from("dataset_joins")
        .select(
          `
          id,
          country_iso,
          notes,
          admin_datasets ( title, year ),
          population_datasets ( title, year ),
          gis_datasets ( title, year )
        `
        )
        .eq("country_iso", countryIso)
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching dataset join:", error);
      } else {
        setJoin(data as unknown as DatasetJoin);
      }
    };
    fetchJoin();
  }, [countryIso]);

  return (
    <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link2 className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Manage Joins</h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Link Admin, Population, and GIS datasets together for consistency in analysis.
      </p>
      <div className="text-sm space-y-1">
        <p>
          <strong>Admin:</strong>{" "}
          {join?.admin_datasets?.[0]?.title ? (
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-blue-600 hover:underline"
            >
              {join.admin_datasets[0].title} ({join.admin_datasets[0].year})
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <strong>Population:</strong>{" "}
          {join?.population_datasets?.[0]?.title ? (
            <Link
              href={`/country/${countryIso}/population`}
              className="text-blue-600 hover:underline"
            >
              {join.population_datasets[0].title} ({join.population_datasets[0].year})
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <strong>GIS:</strong>{" "}
          {join?.gis_datasets?.[0]?.title ? (
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-blue-600 hover:underline"
            >
              {join.gis_datasets[0].title} ({join.gis_datasets[0].year})
            </Link>
          ) : (
            "—"
          )}
        </p>
      </div>
      <Link
        href={`/country/${countryIso}/joins`}
        className="mt-4 inline-block px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:opacity-90"
      >
        Manage
      </Link>
    </div>
  );
}
