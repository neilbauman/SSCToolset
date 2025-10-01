"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label: string;
  adm1_label: string;
  adm2_label: string;
  adm3_label: string;
  adm4_label: string;
  adm5_label: string;
};

type AdminUnit = {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string | null;
  source?: { name: string; url?: string };
};

export default function AdminUnitsPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [hasData, setHasData] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);
  const [view, setView] = useState<"table" | "tree">("table");

  // Country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Admin units
  useEffect(() => {
    const fetchAdminUnits = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("*")
        .eq("country_iso", countryIso);
      console.log("AdminUnits sample:", data?.slice(0, 5));
      if (data) {
        setAdminUnits(data as AdminUnit[]);
        setHasData(data.length > 0);
        const grouped: Record<string, number> = {};
        (data as AdminUnit[]).forEach((u) => {
          grouped[u.level] = (grouped[u.level] || 0) + 1;
        });
        setCounts(grouped);
      } else {
        setHasData(false);
      }
    };
    fetchAdminUnits();
  }, [countryIso]);

  // Dataset source
  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {!hasData ? (
        <div className="border rounded-lg p-6 text-center text-gray-500 italic">
          🚫 No admin units uploaded yet for this country.
        </div>
      ) : (
        <>
          {/* Summary + DatasetHealth + Views (unchanged) */}
          {view === "tree" && <AdminUnitsTree units={adminUnits} />}
        </>
      )}

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("admin_units")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}
