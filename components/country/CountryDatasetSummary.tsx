"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Link from "next/link";

type DatasetSummary = {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string | null;
  record_count: number | null;
  year: number | null;
};

export default function CountryDatasetSummary({ countryIso }: { countryIso: string }) {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,dataset_type,admin_level,record_count,year")
        .eq("country_iso", countryIso)
        .order("title", { ascending: true });

      if (!error && data) setDatasets(data);
      setLoading(false);
    };
    load();
  }, [countryIso]);

  if (loading)
    return <div className="text-sm text-gray-500">Loading datasets...</div>;

  if (!datasets.length)
    return <div className="text-sm text-gray-500">No datasets uploaded yet.</div>;

  // Categorize datasets
  const admin = datasets.filter((d) => d.dataset_type === "admin");
  const population = datasets.filter((d) => d.dataset_type === "population");
  const gis = datasets.filter((d) => d.dataset_type === "gis");
  const derived = datasets.filter((d) => d.dataset_type === "derived");

  // ✅ Fix: include gradient, categorical, adm0 and unknown types as "other"
  const others = datasets.filter(
    (d) =>
      !["admin", "population", "gis", "derived"].includes(d.dataset_type || "")
  );

  const Section = ({
    title,
    items,
    linkBase,
  }: {
    title: string;
    items: DatasetSummary[];
    linkBase?: string;
  }) => (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-1 space-y-1 text-sm">
          {items.map((d) => (
            <li key={d.id} className="flex justify-between border-b py-1">
              <span>
                {linkBase ? (
                  <Link
                    href={`${linkBase}/${d.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {d.title}
                  </Link>
                ) : (
                  d.title
                )}
                {d.admin_level ? ` — ${d.admin_level}` : ""}
              </span>
              <span className="text-gray-500">
                {d.year ?? "—"} | {d.record_count ?? "?"} records
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic mt-1">
          No {title.toLowerCase()} uploaded yet.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <Section title="Administrative Datasets" items={admin} />
      <Section title="Population Datasets" items={population} />
      <Section title="GIS Datasets" items={gis} />
      <Section title="Other Datasets" items={others} />
      <Section title="Derived Datasets" items={derived} />
    </div>
  );
}
