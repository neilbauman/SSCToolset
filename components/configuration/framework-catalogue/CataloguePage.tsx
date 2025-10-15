"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCcw, ChevronRight, ChevronDown } from "lucide-react";
import IndicatorLinkModal from "./IndicatorLinkModal";

type EntityType = "pillar" | "theme" | "subtheme";
type Entity = { id: string; name: string; type: EntityType };

type Pillar = { id: string; name: string; description: string | null; themes?: Theme[] };
type Theme = { id: string; pillar_id: string; name: string; description: string | null; subthemes?: Subtheme[] };
type Subtheme = { id: string; theme_id: string; name: string; description: string | null };

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<Entity | null>(null);

  useEffect(() => { loadCatalogue(); }, []);

  async function loadCatalogue() {
    setLoading(true);
    const [p, t, s] = await Promise.all([
      supabase.from("pillar_catalogue").select("id,name,description").order("name"),
      supabase.from("theme_catalogue").select("id,name,description,pillar_id").order("name"),
      supabase.from("subtheme_catalogue").select("id,name,description,theme_id").order("name"),
    ]);
    if (p.error || t.error || s.error) {
      console.error("Failed to load framework catalogue", p.error || t.error || s.error);
      setLoading(false);
      return;
    }
    const themes = (t.data || []).map((x) => ({
      ...x,
      subthemes: (s.data || []).filter((y) => y.theme_id === x.id),
    }));
    const tree = (p.data || []).map((x) => ({
      ...x,
      themes: themes.filter((y) => y.pillar_id === x.id),
    }));
    setPillars(tree);
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--gsc-blue)]">Framework Catalogue</h2>
        <button onClick={loadCatalogue} className="flex items-center gap-1 text-sm border px-3 py-2 rounded-md">
          <RefreshCcw className="w-4 h-4" /> Reload
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading catalogue...</p>
      ) : (
        <div className="space-y-3">
          {pillars.map((pillar) => (
            <div key={pillar.id} className="border rounded-md bg-white">
              <div
                className="flex justify-between items-center px-3 py-2 cursor-pointer font-semibold text-sm"
                style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}
                onClick={() => toggle(pillar.id)}
              >
                <div className="flex items-center gap-1">
                  {expanded.has(pillar.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {pillar.name}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkTarget({ type: "pillar", id: pillar.id, name: pillar.name });
                    setOpenLinkModal(true);
                  }}
                  className="text-xs text-[var(--gsc-blue)] hover:underline"
                >
                  Manage Indicators
                </button>
              </div>

              {expanded.has(pillar.id) && (
                <div className="divide-y">
                  {(pillar.themes || []).map((theme) => (
                    <div key={theme.id}>
                      <div
                        className="flex justify-between items-center px-4 py-2 cursor-pointer"
                        onClick={() => toggle(theme.id)}
                      >
                        <div className="flex items-center gap-1">
                          {expanded.has(theme.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <div>
                            <div className="font-medium">{theme.name}</div>
                            {theme.description && (
                              <div className="text-xs text-gray-500">{theme.description}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkTarget({ type: "theme", id: theme.id, name: theme.name });
                            setOpenLinkModal(true);
                          }}
                          className="text-xs text-[var(--gsc-blue)] hover:underline"
                        >
                          Manage Indicators
                        </button>
                      </div>

                      {expanded.has(theme.id) && theme.subthemes?.length ? (
                        <div className="pl-6 border-l">
                          {theme.subthemes.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex justify-between px-2 py-1 text-sm"
                            >
                              <div>
                                <div>{sub.name}</div>
                                {sub.description && (
                                  <div className="text-xs text-gray-500">{sub.description}</div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setLinkTarget({ type: "subtheme", id: sub.id, name: sub.name });
                                  setOpenLinkModal(true);
                                }}
                                className="text-xs text-[var(--gsc-blue)] hover:underline"
                              >
                                Manage Indicators
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openLinkModal && linkTarget && (
        <IndicatorLinkModal
          open={openLinkModal}
          onClose={() => setOpenLinkModal(false)}
          entity={linkTarget}
          onSaved={loadCatalogue}
        />
      )}
    </div>
  );
}
