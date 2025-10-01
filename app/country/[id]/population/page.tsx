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
  iso: string;
  name: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  population: number;
  last_updated: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso, name")
        .eq("iso", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchPopulation = async () => {
      const { data } = await supabase
        .from("population_data")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setPopulation(data as PopulationRow[]);
    };
    fetchPopulation();
  }, [countryIso]);

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

  // Health checks
  const missingPop = population.filter(
    (p) => !p.population || p.population <= 0
  ).length;
  const hasPopulation = population.length > 0 && missingPop === 0;
  const hasGISLink = false;
  const allHavePcodes =
    population.length > 0 && population.every((p) => p.pcode);
  const missingPcodes = population.filter((p) => !p.pcode).length;

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
      {/* (UI unchanged: summary, dataset health, table, modal) */}
    </SidebarLayout>
  );
}
