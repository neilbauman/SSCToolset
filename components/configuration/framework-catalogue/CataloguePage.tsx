"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, RefreshCcw } from "lucide-react";
import IndicatorLinkModal from "./IndicatorLinkModal";

type Pillar = { id: string; name: string; description: string | null };
type Theme = { id: string; name: string; description: string | null; pillar_id: string | null };
type Subtheme = { id: string; name: string; description: string | null; theme_id: string | null };

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [subs, setSubs] = useState<Subtheme[]>([]);
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ id: string; type: "pillar" | "theme" | "subtheme"; name: string } | null>(null);

  async function load() {
    const [p, t, s] = await Promise.all([
      supabase.from("pillar_catalogue").select("*").order("name"),
      supabase.from("theme_catalogue").select("*").order("name"),
      supabase.from("subtheme_catalogue").select("*").order("name"),
    ]);
    setPillars(p.data || []);
    setThemes(t.data || []);
    setSubs(s.data || []);
  }

  useEffect(() => { load(); }, []);

  const headerProps = {
    title: "Framework Catalogue",
    group: "ssc-config" as const,
    description: "Manage the master list of Pillars, Themes, and Subthemes used to build framework versions.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuration", href: "/configuration" },
          { label: "Framework Catalogue" },
        ]}
      />
    ),
  };

  const renderEntity = (label: string, items: any[], type: "pillar" | "theme" | "subtheme") => (
    <div className="border rounded bg-white mb-4">
      <div className="px-3 py-2 border-b bg-[var(--gsc-beige)] font-medium text-[var(--gsc-gray)]">
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic px-3 py-2">No {label.toLowerCase()} yet.</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.id} className="flex justify-between items-center border-t px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{i.name}</div>
                {i.description && <div className="text-xs text-gray-500">{i.description}</div>}
              </div>
              <button
                onClick={() => {
                  setLinkTarget({ id: i.id, type, name: i.name });
                  setOpenLinkModal(true);
                }}
                className="text-xs text-[var(--gsc-blue)] hover:underline"
              >
                Manage Indicators
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>Framework Catalogue</h2>
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border">
          <RefreshCcw className="w-4 h-4" /> Reload
        </button>
      </div>

      {renderEntity("Pillars", pillars, "pillar")}
      {renderEntity("Themes", themes, "theme")}
      {renderEntity("Subthemes", subs, "subtheme")}

      {openLinkModal && linkTarget && (
        <IndicatorLinkModal
          open
          onClose={() => setOpenLinkModal(false)}
          entity={linkTarget}
          onSaved={load}
        />
      )}
    </SidebarLayout>
  );
}
