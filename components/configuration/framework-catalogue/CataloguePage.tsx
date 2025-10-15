"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ChevronRight, ChevronDown, RefreshCcw } from "lucide-react";
import IndicatorLinkModal from "./IndicatorLinkModal";

type Pillar = { id: string; name: string; description: string };
type Theme = { id: string; name: string; description: string; pillar_id: string };
type Subtheme = { id: string; name: string; description: string; theme_id: string };
type IndicatorLink = {
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  indicator_catalogue?: { code: string; name: string } | null;
};

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [subs, setSubs] = useState<Subtheme[]>([]);
  const [indicatorMap, setIndicatorMap] = useState<Map<string, IndicatorLink>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ id: string; name: string; type: string } | null>(
    null
  );

  const headerProps = {
    title: "Framework Catalogue",
    group: "ssc-config" as const,
    description:
      "Manage the master list of Pillars, Themes, and Subthemes used to build framework versions.",
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

  useEffect(() => {
    loadCatalogue();
  }, []);

  async function loadCatalogue() {
    const [p, t, s, links] = await Promise.all([
      supabase.from("pillar_catalogue").select("id, name, description").order("name"),
      supabase.from("theme_catalogue").select("id, name, description, pillar_id").order("name"),
      supabase.from("subtheme_catalogue").select("id, name, description, theme_id").order("name"),
      supabase
        .from("catalogue_indicator_links")
        .select("pillar_id, theme_id, subtheme_id, indicator_catalogue ( code, name )"),
    ]);

    setPillars(p.data || []);
    setThemes(t.data || []);
    setSubs(s.data || []);

    const map = new Map<string, IndicatorLink>();
    (links.data || []).forEach((row: any) => {
      const key = row.pillar_id || row.theme_id || row.subtheme_id;
      const indicator = Array.isArray(row.indicator_catalogue)
        ? row.indicator_catalogue[0]
        : row.indicator_catalogue;
      map.set(key, { ...row, indicator_catalogue: indicator });
    });
    setIndicatorMap(map);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const renderSubthemes = (themeId: string) => {
    const list = subs.filter((s) => s.theme_id === themeId);
    if (!list.length) return null;
    return (
      <div className="pl-6 border-l border-gray-200">
        {list.map((sub) => (
          <div key={sub.id} className="flex justify-between py-1 border-b text-sm">
            <div>
              <div className="font-medium text-gray-800">{sub.name}</div>
              {sub.description && <div className="text-gray-500 text-xs">{sub.description}</div>}
            </div>
            <div className="flex items-center gap-4">
              <IndicatorBadge entityId={sub.id} map={indicatorMap} />
              <button
                onClick={() => {
                  setLinkTarget({ id: sub.id, name: sub.name, type: "subtheme" });
                  setOpenLinkModal(true);
                }}
                className="text-[var(--gsc-blue)] hover:underline text-xs"
              >
                Manage Indicators
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderThemes = (pillarId: string) => {
    const list = themes.filter((t) => t.pillar_id === pillarId);
    if (!list.length) return null;
    return (
      <div className="pl-4 border-l border-gray-200">
        {list.map((theme) => {
          const isOpen = expanded.has(theme.id);
          return (
            <div key={theme.id} className="border-b">
              <div className="flex justify-between items-center py-2 text-sm">
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleExpand(theme.id)}>
                    {isOpen ? (
                      <ChevronDown size={14} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-600" />
                    )}
                  </button>
                  <div>
                    <div className="font-medium text-gray-800">{theme.name}</div>
                    {theme.description && (
                      <div className="text-gray-500 text-xs">{theme.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <IndicatorBadge entityId={theme.id} map={indicatorMap} />
                  <button
                    onClick={() => {
                      setLinkTarget({ id: theme.id, name: theme.name, type: "theme" });
                      setOpenLinkModal(true);
                    }}
                    className="text-[var(--gsc-blue)] hover:underline text-xs"
                  >
                    Manage Indicators
                  </button>
                </div>
              </div>
              {isOpen && renderSubthemes(theme.id)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>
          Framework Catalogue
        </h2>
        <button
          onClick={loadCatalogue}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md"
        >
          <RefreshCcw size={14} /> Reload
        </button>
      </div>

      <div className="space-y-4">
        {pillars.map((pillar) => {
          const isOpen = expanded.has(pillar.id);
          return (
            <div key={pillar.id} className="border rounded-md">
              <div
                className="flex justify-between items-center px-3 py-2 bg-[var(--gsc-beige)] border-b cursor-pointer"
                onClick={() => toggleExpand(pillar.id)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown size={16} className="text-gray-700" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-700" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-800">{pillar.name}</div>
                    {pillar.description && (
                      <div className="text-xs text-gray-500">{pillar.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <IndicatorBadge entityId={pillar.id} map={indicatorMap} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinkTarget({ id: pillar.id, name: pillar.name, type: "pillar" });
                      setOpenLinkModal(true);
                    }}
                    className="text-[var(--gsc-blue)] hover:underline text-xs"
                  >
                    Manage Indicators
                  </button>
                </div>
              </div>
              {isOpen && renderThemes(pillar.id)}
            </div>
          );
        })}
      </div>

      {openLinkModal && linkTarget && (
        <IndicatorLinkModal
          open={openLinkModal}
          onClose={() => setOpenLinkModal(false)}
          entity={linkTarget}
          onSaved={loadCatalogue}
        />
      )}
    </SidebarLayout>
  );
}

function IndicatorBadge({
  entityId,
  map,
}: {
  entityId: string;
  map: Map<string, IndicatorLink>;
}) {
  const link = map.get(entityId);
  if (!link || !link.indicator_catalogue)
    return (
      <span className="text-xs italic text-gray-400" title="No linked indicator">
        ⚠ Missing
      </span>
    );
  return (
    <span
      className="text-xs font-medium text-[var(--gsc-blue)]"
      title={link.indicator_catalogue?.name || ""}
    >
      {link.indicator_catalogue?.code}
    </span>
  );
}
