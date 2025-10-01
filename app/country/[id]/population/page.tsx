"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  population: number;
  year: number;
  dataset_date: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso) // ✅ countries
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Population data
  useEffect(() => {
    const fetchPopulation = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("*")
        .eq("country_iso", countryIso); // ✅ population_data
      if (data) setPopulation(data as PopulationRow[]);
    };
    fetchPopulation();
  }, [countryIso]);

  // Dataset source
  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  // Health
  const missingPop = population.filter((p) => !p.population || p.population <= 0).length;
  const hasPopulation = population.length > 0 && missingPop === 0;
  const hasGISLink = false;
  const allHavePcodes = population.length > 0 && population.every((p) => p.pcode);
  const missingPcodes = population.filter((p) => !p.pcode).length;

  // Pagination
  const filtered = population.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + DatasetHealth + Table like before */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("population_data")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
