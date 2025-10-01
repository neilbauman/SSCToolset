"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Map, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso: string;
  name: string;
};

type GISRow = {
  id: string;
  name: string;
  level: string;
  pcode: string;
  geometry_available: boolean;
  last_updated: string;
  source?: { name: string; url?: string };
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [gisData, setGisData] = useState<GISRow[]>([]);
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
    const fetchGIS = async () => {
      const { data } = await supabase
        .from("gis_data")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setGisData(data as GISRow[]);
    };
    fetchGIS();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("gis_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const hasGeometries =
    gisData.length > 0 && gisData.every((g) => g.geometry_available);
  const missingGeoms = gisData.filter((g) => !g.geometry_available).length;
  const allHavePcodes = gisData.length > 0 && gisData.every((g) => g.pcode);
  const missingPcodes = gisData.filter((g) => !g.pcode).length;
  const hasPopulationLink = false;

  const filtered = gisData.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Data`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded GIS / boundary datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
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
