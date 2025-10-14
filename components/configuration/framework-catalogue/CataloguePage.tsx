"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import AddPillarModal from "./AddPillarModal";
import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal";
import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditSubthemeModal from "./EditSubthemeModal";

/* ---------- Types ---------- */
export type Pillar = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  themes?: Theme[];
};
export type Theme = {
  id: string;
  pillar_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  subthemes?: Subtheme[];
};
export type Subtheme = {
  id: string;
  theme_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
};

/* ---------- Component ---------- */
export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [editPillar, setEditPillar] = useState<Pillar | null>(null);
  const [addThemeParent, setAddThemeParent] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const [addSubthemeParent, setAddSubthemeParent] = useState<Theme | null>(null);
  const [editSubtheme, setEditSubtheme] = useState<Subtheme | null>(null);

  /* ---------- Load full hierarchy ---------- */
  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    setLoading(true);

    const { data: pillarsData, error: pillarErr } = await supabase
      .from("pillar_catalogue")
      .select("*")
      .order("sort_order", { ascending: true });
    if (pillarErr) {
      console.error("Error loading pillars:", pillarErr);
      setPillars([]);
      setLoading(false);
      return;
    }

    const { data: themesData, error: themeErr } = await supabase
      .from("theme_catalogue")
      .select("*")
      .order("sort_order", { ascending: true });
    const { data: subthemesData, error: subErr } = await supabase
      .from("subtheme_catalogue")
      .select("*")
      .order("sort_order", { ascending: true });

    if (themeErr || subErr) {
      console.error("Error loading themes/subthemes:", themeErr || subErr);
      setPillars(pillarsData || []);
      setLoading(false);
      return;
    }

    // Nest hierarchy
    const subMap = (subthemesData || []).reduce<Record<string, Subtheme[]>>((acc, s) => {
      if (!acc[s.theme_id]) acc[s.theme_id] = [];
      acc[s.theme_id].push(s);
      return acc;
    }, {});

    const themeMap = (themesData || []).reduce<Record<string, Theme[]>>((acc, t) => {
      if (!acc[t.pillar_id]) acc[t.pillar_id] = [];
      acc[t.pillar_id].push({ ...t, subthemes: subMap[t.id] || [] });
      return acc;
    }, {});

    const tree = (pillarsData || []).map((p) => ({
      ...p,
      themes: themeMap[p.id] || [],
    }));

    setPillars(tree);
    setExpandedPillars({});
    setExpandedThemes({});
    setLoading(false);
  }

  /* ---------- Helpers ---------- */
  const toggle = (id: string, fn: any) => fn((p: any) => ({ ...p, [id]: !p[id] }));

  const confirmDelete = async (msg: string, table: string, id: string) => {
    if (!confirm(msg)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete: " + error.message);
    } else {
      await loadTree();
    }
  };

  const hasData = useMemo(() => (pillars || []).length > 0, [pillars]);

  /* ---------- UI ---------- */
  return (
    <div>
      <div className="flex justify-between mb-3">
        <h2 className="text-lg font-semibold text-[var(--gsc-blue)]">
          Framework Catalogue
        </h2>
        <div className="flex gap-2">
          <button
            onClick={loadTree}
            className="px-3 py-2 text-sm border rounded-md flex items-center gap-1"
          >
            <RefreshCcw className="w-4 h-4" /> Reload
          </button>
          <button
            onClick={() => setShowAddPillar(true)}
            className="px-3 py-2 text-sm rounded-md flex items-center gap-1 text-white"
            style={{ background: "var(--gsc-blue)" }}
          >
            <Plus className="w-4 h-4" /> Add Pillar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 bg-[var(--gsc-beige)] border text-sm font-medium text-[var(--gsc-gray)]">
        <div className="col-span-3 p-2">Type / Code</div>
        <div className="col-span-7 p-2">Name / Description</div>
        <div className="col-span-2 p-2 text-right">Actions</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue…
        </div>
      ) : !hasData ? (
        <p className="text-sm text-gray-500 italic mt-3">No pillars yet.</p>
      ) : (
        <div className="divide-y">
          {pillars.map((p) => (
            <div key={p.id}>
              {/* ---- PILLAR ---- */}
              <div className="grid grid-cols-12 text-sm">
                <div className="col-span-3 flex items-center gap-2 p-2">
                  <button onClick={() => toggle(p.id, setExpandedPillars)}>
                    {expandedPillars[p.id] ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4 rotate-180" />
                    )}
                  </button>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    pillar
                  </span>
                  <span className="text-xs text-gray-500">{p.code}</span>
                </div>
                <div className="col-span-7 p-2">
                  <div className="font-medium">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-gray-500">{p.description}</div>
                  )}
                </div>
                <div className="col-span-2 p-2 flex justify-end gap-1">
                  <button
                    onClick={() =>
                      confirmDelete(
                        `Delete pillar "${p.name}"? This will also delete its themes and subthemes.`,
                        "pillar_catalogue",
                        p.id
                      )
                    }
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                  </button>
                  <button onClick={() => setEditPillar(p)} title="Edit">
                    <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                  </button>
                  <button onClick={() => setAddThemeParent(p)} title="Add Theme">
                    <Plus className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* ---- THEMES ---- */}
              {expandedPillars[p.id] &&
                (p.themes || []).map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-12 text-sm border-t"
                    style={{ paddingLeft: 24 }}
                  >
                    <div className="col-span-3 flex items-center gap-2 p-2">
                      <button onClick={() => toggle(t.id, setExpandedThemes)}>
                        {expandedThemes[t.id] ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUp className="w-4 h-4 rotate-180" />
                        )}
                      </button>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        theme
                      </span>
                      <span className="text-xs text-gray-500">{t.code}</span>
                    </div>
                    <div className="col-span-7 p-2">
                      <div className="font-medium">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-gray-500">{t.description}</div>
                      )}
                    </div>
                    <div className="col-span-2 p-2 flex justify-end gap-1">
                      <button
                        onClick={() =>
                          confirmDelete(
                            `Delete theme "${t.name}" and its subthemes?`,
                            "theme_catalogue",
                            t.id
                          )
                        }
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                      </button>
                      <button onClick={() => setEditTheme(t)} title="Edit">
                        <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                      </button>
                      <button
                        onClick={() => setAddSubthemeParent(t)}
                        title="Add Subtheme"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>

                    {/* ---- SUBTHEMES ---- */}
                    {expandedThemes[t.id] &&
                      (t.subthemes || []).map((s) => (
                        <div
                          key={s.id}
                          className="col-span-12 grid grid-cols-12 text-sm border-t"
                          style={{ paddingLeft: 48 }}
                        >
                          <div className="col-span-3 flex items-center gap-2 p-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                              subtheme
                            </span>
                            <span className="text-xs text-gray-500">{s.code}</span>
                          </div>
                          <div className="col-span-7 p-2">
                            <div className="font-medium">{s.name}</div>
                            {s.description && (
                              <div className="text-xs text-gray-500">
                                {s.description}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 p-2 flex justify-end gap-1">
                            <button
                              onClick={() =>
                                confirmDelete(
                                  `Delete subtheme "${s.name}"?`,
                                  "subtheme_catalogue",
                                  s.id
                                )
                              }
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                            </button>
                            <button
                              onClick={() => setEditSubtheme(s)}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* ---- Modals ---- */}
      {showAddPillar && (
        <AddPillarModal open onClose={() => setShowAddPillar(false)} onSaved={loadTree} />
      )}
      {editPillar && (
        <EditPillarModal
          open
          pillar={editPillar}
          onClose={() => setEditPillar(null)}
          onSaved={loadTree}
        />
      )}
      {addThemeParent && (
        <AddThemeModal
          open
          pillar={addThemeParent}
          onClose={() => setAddThemeParent(null)}
          onSaved={loadTree}
        />
      )}
      {editTheme && (
        <EditThemeModal
          open
          theme={editTheme}
          onClose={() => setEditTheme(null)}
          onSaved={loadTree}
        />
      )}
      {addSubthemeParent && (
        <AddSubthemeModal
          open
          theme={addSubthemeParent}
          onClose={() => setAddSubthemeParent(null)}
          onSaved={loadTree}
        />
      )}
      {editSubtheme && (
        <EditSubthemeModal
          open
          subtheme={editSubtheme}
          onClose={() => setEditSubtheme(null)}
          onSaved={loadTree}
        />
      )}
    </div>
  );
}
