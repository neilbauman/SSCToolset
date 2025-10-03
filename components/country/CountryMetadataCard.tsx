"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = { countryIso: string };

type Country = {
  iso_code: string;
  name: string;
  adm0_label: string | null;
  adm1_label: string | null;
  adm2_label: string | null;
  adm3_label: string | null;
  adm4_label: string | null;
  adm5_label: string | null;
};

export default function CountryMetadataCard({ countryIso }: Props) {
  const [country, setCountry] = useState<Country | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("countries")
        .select(
          "iso_code,name,adm0_label,adm1_label,adm2_label,adm3_label,adm4_label,adm5_label"
        )
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    run();
  }, [countryIso]);

  const L = (v: string | null | undefined, fallback: string) =>
    (v ?? "").trim() || fallback;

  return (
    <section className="border rounded-lg p-5 shadow-sm">
      <h3 className="text-2xl font-semibold mb-3">Country Metadata</h3>
      <h4 className="text-[color:var(--gsc-red)] font-semibold mb-4">Core Metadata</h4>

      <dl className="space-y-3 text-[15px] leading-6 text-gray-900">
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ISO:</dt><dd>{country?.iso_code ?? countryIso}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">Name:</dt><dd>{country?.name ?? "—"}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM0 Label:</dt><dd>{L(country?.adm0_label, "Country")}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM1 Label:</dt><dd>{L(country?.adm1_label, "Region")}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM2 Label:</dt><dd>{L(country?.adm2_label, "Province")}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM3 Label:</dt><dd>{L(country?.adm3_label, "Municipality")}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM4 Label:</dt><dd>{L(country?.adm4_label, "—")}</dd></div>
        <div className="flex gap-2"><dt className="font-semibold min-w-[120px]">ADM5 Label:</dt><dd>{L(country?.adm5_label, "N/A")}</dd></div>
      </dl>

      <div className="mt-8">
        <a
          href={`/country/${countryIso}/metadata`}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-2 text-[15px] font-medium text-gray-900 hover:bg-gray-100 border"
        >
          <span className="inline-block">✎</span> Edit Metadata
        </a>
      </div>
    </section>
  );
}
