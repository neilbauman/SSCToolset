"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCcw } from "lucide-react";
import IndicatorLinkModal from "./IndicatorLinkModal";

type Pillar = {
  id: string;
  name: string;
  description: string | null;
  themes?: Theme[];
};
type Theme = {
  id: string;
  pillar_id: string;
  name: string;
  description: string | null;
  subthemes?: Subtheme[];
};
type Subtheme = {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
};

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    loadCatalogue();
  }, []);

  async function loadCatalogue() {
    setLoading(true);

    // Step 1. Load all pillars
    const { data: pData, error: pErr } = await supabase
      .from("pillar_catalogue")
      .select("id, name, description")
      .order("name", { ascending: true });
    if (pErr) {
      console.error("Failed to load pillars", pErr);
      setLoading(false);
      return;
    }

    // Step 2. Load themes
    const { data: tData, error: tErr } = await supabase
      .from("theme_catalogue")
      .select("id, name, description, pillar_id")
      .order("name", { ascending: true });
    if (tErr) {
      console.error("Failed to load themes", tErr);
      setLoading(false);
      return;
    }

    // Step 3. Load subthemes
    const { data: sData, error: sErr } = await supabase
      .from("subtheme_catalogue")
      .select("id, name, description, theme_id")
      .order("name", { ascending: true });
    if (sErr) {
      console.error("Failed to load subthemes", sErr);
      setLoading(false);
      return;
    }

    // Step 4. Build hierarchy
    const themesWithSubs = (tData || []).map((t) => ({
      ...t,
      subthemes: (sData || []).filter((s) => s.theme_id === t.id),
    }));

    const pillarsWithThemes = (pData || []).map((p) => ({
      ...p,
      themes: themesWithSubs.filter((t) => t.pillar_id === p.id),
    }));

    setPillars(pillarsWithThemes);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[var(--gsc-blue)]">Framework Catalogue</h2>
        <button
          onClick={loadCatalogue}
          className="flex items-center gap-1 text-sm border px-3 py-2 rounded-md"
        >
          <RefreshCcw className="w-4 h-4" /> Reload
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          {pillars.map((pillar) => (
            <div key={pillar.id} className="border rounded-md bg-white">
              <div
                className="px-3 py-2 font-semibold text-sm"
                style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}
              >
                {pillar.name}
              </div>
              <div className="divide-y">
                {pillar.themes?.length ? (
                  pillar.themes.map((theme) => (
                    <div key={theme.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{theme.name}</div>
                          {theme.description && (
                            <div className="text-xs text-gray-500">{theme.description}</div>
                          )}
                        </div>
                        <button
                          className="text-sm text-[var(--gsc-blue)] hover:underline"
                          onClick={() => {
                            setLinkTarget({ type: "theme", id: theme.id, name: theme.name });
                            setOpenLinkModal(true);
                          }}
                        >
                          Manage Indicators
                        </button>
                      </div>
                      {theme.subthemes?.length ? (
                        <div className="pl-4 mt-2 border-l">
                          {theme.subthemes.map((sub) => (
                            <div key={sub.id} className="flex justify-between py-1">
                              <div>
                                <div className="text-sm">{sub.name}</div>
                                {sub.description && (
                                  <div className="text-xs text-gray-500">{sub.description}</div>
                                )}
                              </div>
                              <button
                                className="text-xs text-[var(--gsc-blue)] hover:underline"
                                onClick={() => {
                                  setLinkTarget({ type: "subtheme", id: sub.id, name: sub.name });
                                  setOpenLinkModal(true);
                                }}
                              >
                                Manage Indicators
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">
                    No themes found under this pillar.
                  </div>
                )}
              </div>
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
