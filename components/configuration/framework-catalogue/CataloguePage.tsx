"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Loader2, RefreshCcw, Save } from "lucide-react";
import {
  listCatalogueTree,
  createPillar,
  updatePillar,
  deletePillar,
  createTheme,
  updateTheme,
  deleteTheme,
  createSubtheme,
  updateSubtheme,
  deleteSubtheme,
  setPillarOrder,
  setThemeOrder,
  setSubthemeOrder,
} from "@/lib/services/frameworkCatalogue";
import AddPillarModal from "./AddPillarModal";
import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal";
import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditSubthemeModal from "./EditSubthemeModal";

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

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [dirtyOrder, setDirtyOrder] = useState(false);

  // Modals state
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [editPillar, setEditPillar] = useState<Pillar | null>(null);

  const [addThemeParent, setAddThemeParent] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);

  const [addSubthemeParent, setAddSubthemeParent] = useState<Theme | null>(null);
  const [editSubtheme, setEditSubtheme] = useState<Subtheme | null>(null);

  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    setLoading(true);
    const data = await listCatalogueTree();
    setPillars(data);
    setExpandedPillars({});
    setExpandedThemes({});
    setDirtyOrder(false);
    setLoading(false);
  }

  function togglePillar(id: string) {
    setExpandedPillars((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleTheme(id: string) {
    setExpandedThemes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ---- Reorder helpers (local swap, mark dirty) ----
  function movePillar(id: string, dir: "up" | "down") {
    setPillars((prev) => {
      const arr = [...prev];
      const i = arr.findIndex((p) => p.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setDirtyOrder(true);
      return arr;
    });
  }

  function moveTheme(pillarId: string, themeId: string, dir: "up" | "down") {
    setPillars((prev) => {
      const arr = prev.map((p) => ({ ...p, themes: [...(p.themes || [])] }));
      const p = arr.find((x) => x.id === pillarId);
      if (!p || !p.themes) return prev;
      const i = p.themes.findIndex((t) => t.id === themeId);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= p.themes.length) return prev;
      [p.themes[i], p.themes[j]] = [p.themes[j], p.themes[i]];
      setDirtyOrder(true);
      return arr;
    });
  }

  function moveSubtheme(themeId: string, subId: string, dir: "up" | "down") {
    setPillars((prev) => {
      const arr = prev.map((p) => ({
        ...p,
        themes: p.themes?.map((t) => ({ ...t, subthemes: [...(t.subthemes || [])] })),
      }));
      const theme = arr.flatMap((p) => p.themes || []).find((t) => t.id === themeId);
      if (!theme || !theme.subthemes) return prev;
      const i = theme.subthemes.findIndex((s) => s.id === subId);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= theme.subthemes.length) return prev;
      [theme.subthemes[i], theme.subthemes[j]] = [theme.subthemes[j], theme.subthemes[i]];
      setDirtyOrder(true);
      return arr;
    });
  }

  // ---- Persist order ----
  async function saveAllOrder() {
    // Persist pillar order
    await setPillarOrder(
      pillars.map((p, idx) => ({ id: p.id, sort_order: idx }))
    );

    // Persist theme order per pillar
    for (const p of pillars) {
      await setThemeOrder(
        p.id,
        (p.themes || []).map((t, idx) => ({ id: t.id, sort_order: idx }))
      );
      // Persist subtheme order per theme
      for (const t of p.themes || []) {
        await setSubthemeOrder(
          t.id,
          (t.subthemes || []).map((s, idx) => ({ id: s.id, sort_order: idx }))
        );
      }
    }
    await loadTree();
  }

  // ---- CRUD handlers ----
  async function handleCreatePillar(payload: { code: string; name: string; description: string }) {
    const created = await createPillar(payload);
    if (created) await loadTree();
  }
  async function handleUpdatePillar(id: string, patch: Partial<Pillar>) {
    await updatePillar(id, patch);
    await loadTree();
  }
  async function handleDeletePillar(p: Pillar) {
    if (!confirm(`Delete pillar "${p.name}" and all its themes/subthemes?`)) return;
    await deletePillar(p.id);
    await loadTree();
  }

  async function handleCreateTheme(pillarId: string, payload: { code: string; name: string; description: string }) {
    await createTheme(pillarId, payload);
    await loadTree();
  }
  async function handleUpdateTheme(id: string, patch: Partial<Theme>) {
    await updateTheme(id, patch);
    await loadTree();
  }
  async function handleDeleteTheme(t: Theme) {
    if (!confirm(`Delete theme "${t.name}" and all its subthemes?`)) return;
    await deleteTheme(t.id);
    await loadTree();
  }

  async function handleCreateSubtheme(themeId: string, payload: { code: string; name: string; description: string }) {
    await createSubtheme(themeId, payload);
    await loadTree();
  }
  async function handleUpdateSubtheme(id: string, patch: Partial<Subtheme>) {
    await updateSubtheme(id, patch);
    await loadTree();
  }
  async function handleDeleteSubtheme(s: Subtheme) {
    if (!confirm(`Delete subtheme "${s.name}"?`)) return;
    await deleteSubtheme(s.id);
    await loadTree();
  }

  const hasData = useMemo(() => (pillars || []).length > 0, [pillars]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>
          Catalogue
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTree}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border"
            title="Reload"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={() => setShowAddPillar(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-blue)", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            Add Pillar
          </button>
          {dirtyOrder && (
            <button
              onClick={saveAllOrder}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border"
              title="Save order"
              style={{ borderColor: "var(--gsc-blue)", color: "var(--gsc-blue)" }}
            >
              <Save className="w-4 h-4" />
              Save Order
            </button>
          )}
        </div>
      </div>

      {/* Headings */}
      <div className="grid grid-cols-12 bg-[var(--gsc-beige)] border text-sm font-medium" style={{ color: "var(--gsc-gray)" }}>
        <div className="col-span-3 px-2 py-2">Type / Code</div>
        <div className="col-span-7 px-2 py-2">Name / Description</div>
        <div className="col-span-2 px-2 py-2 text-right">Actions</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue…
        </div>
      ) : !hasData ? (
        <p className="text-sm text-gray-500 italic mt-3">No pillars yet.</p>
      ) : (
        <div className="divide-y">
          {pillars.map((p, pIdx) => (
            <div key={p.id} className="bg-white">
              {/* Pillar row */}
              <div className="grid grid-cols-12 items-center text-sm">
                <div className="col-span-3 px-2 py-2 flex items-center gap-2">
                  <button
                    className="text-gray-500"
                    onClick={() => togglePillar(p.id)}
                    title={expandedPillars[p.id] ? "Collapse" : "Expand"}
                  >
                    {expandedPillars[p.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}
                  </button>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    pillar
                  </span>
                  <span className="text-xs text-gray-500">{p.code}</span>
                </div>
                <div className="col-span-7 px-2 py-2">
                  <div className="font-medium">{p.name}</div>
                  {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                </div>
                <div className="col-span-2 px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      disabled={pIdx === 0}
                      onClick={() => movePillar(p.id, "up")}
                      title="Move up"
                    >
                      <ArrowUp className={`w-4 h-4 ${pIdx === 0 ? "text-gray-300" : "text-gray-600"}`} />
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      disabled={pIdx === pillars.length - 1}
                      onClick={() => movePillar(p.id, "down")}
                      title="Move down"
                    >
                      <ArrowDown className={`w-4 h-4 ${pIdx === pillars.length - 1 ? "text-gray-300" : "text-gray-600"}`} />
                    </button>
                    <button
                      onClick={() => setEditPillar(p)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      title="Edit pillar"
                    >
                      <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                    </button>
                    <button
                      onClick={() => handleDeletePillar(p)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      title="Delete pillar"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                    </button>
                    <button
                      onClick={() => setAddThemeParent(p)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      title="Add theme"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Themes */}
              {expandedPillars[p.id] && (p.themes || []).map((t, tIdx) => (
                <div key={t.id} className="grid grid-cols-12 items-center text-sm border-t" style={{ paddingLeft: 24 }}>
                  <div className="col-span-3 px-2 py-2 flex items-center gap-2">
                    <button
                      className="text-gray-500"
                      onClick={() => toggleTheme(t.id)}
                      title={expandedThemes[t.id] ? "Collapse" : "Expand"}
                    >
                      {expandedThemes[t.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}
                    </button>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      theme
                    </span>
                    <span className="text-xs text-gray-500">{t.code}</span>
                  </div>
                  <div className="col-span-7 px-2 py-2">
                    <div className="font-medium">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                  </div>
                  <div className="col-span-2 px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        disabled={tIdx === 0}
                        onClick={() => moveTheme(p.id, t.id, "up")}
                        title="Move up"
                      >
                        <ArrowUp className={`w-4 h-4 ${tIdx === 0 ? "text-gray-300" : "text-gray-600"}`} />
                      </button>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        disabled={(p.themes || []).length - 1 === tIdx}
                        onClick={() => moveTheme(p.id, t.id, "down")}
                        title="Move down"
                      >
                        <ArrowDown className={`w-4 h-4 ${((p.themes || []).length - 1 === tIdx) ? "text-gray-300" : "text-gray-600"}`} />
                      </button>
                      <button
                        onClick={() => setEditTheme(t)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        title="Edit theme"
                      >
                        <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                      </button>
                      <button
                        onClick={() => handleDeleteTheme(t)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        title="Delete theme"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                      </button>
                      <button
                        onClick={() => setAddSubthemeParent(t)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        title="Add subtheme"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subthemes */}
                  {expandedThemes[t.id] && (t.subthemes || []).map((s, sIdx) => (
                    <div key={s.id} className="col-span-12 grid grid-cols-12 items-center text-sm border-t" style={{ paddingLeft: 48 }}>
                      <div className="col-span-3 px-2 py-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                          subtheme
                        </span>
                        <span className="text-xs text-gray-500">{s.code}</span>
                      </div>
                      <div className="col-span-7 px-2 py-2">
                        <div className="font-medium">{s.name}</div>
                        {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                      </div>
                      <div className="col-span-2 px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                            disabled={sIdx === 0}
                            onClick={() => moveSubtheme(t.id, s.id, "up")}
                            title="Move up"
                          >
                            <ArrowUp className={`w-4 h-4 ${sIdx === 0 ? "text-gray-300" : "text-gray-600"}`} />
                          </button>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                            disabled={(t.subthemes || []).length - 1 === sIdx}
                            onClick={() => moveSubtheme(t.id, s.id, "down")}
                            title="Move down"
                          >
                            <ArrowDown className={`w-4 h-4 ${((t.subthemes || []).length - 1 === sIdx) ? "text-gray-300" : "text-gray-600"}`} />
                          </button>
                          <button
                            onClick={() => setEditSubtheme(s)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                            title="Edit subtheme"
                          >
                            <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubtheme(s)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                            title="Delete subtheme"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddPillar && (
        <AddPillarModal
          open={showAddPillar}
          onClose={() => setShowAddPillar(false)}
          onSaved={(payload) => handleCreatePillar(payload)}
        />
      )}
      {editPillar && (
        <EditPillarModal
          open={!!editPillar}
          onClose={() => setEditPillar(null)}
          pillar={editPillar}
          onSaved={(patch) => handleUpdatePillar(editPillar.id, patch)}
        />
      )}

      {addThemeParent && (
        <AddThemeModal
          open={!!addThemeParent}
          onClose={() => setAddThemeParent(null)}
          pillar={addThemeParent}
          onSaved={(payload) => handleCreateTheme(addThemeParent.id, payload)}
        />
      )}
      {editTheme && (
        <EditThemeModal
          open={!!editTheme}
          onClose={() => setEditTheme(null)}
          theme={editTheme}
          onSaved={(patch) => handleUpdateTheme(editTheme.id, patch)}
        />
      )}

      {addSubthemeParent && (
        <AddSubthemeModal
          open={!!addSubthemeParent}
          onClose={() => setAddSubthemeParent(null)}
          theme={addSubthemeParent}
          onSaved={(payload) => handleCreateSubtheme(addSubthemeParent.id, payload)}
        />
      )}
      {editSubtheme && (
        <EditSubthemeModal
          open={!!editSubtheme}
          onClose={() => setEditSubtheme(null)}
          subtheme={editSubtheme}
          onSaved={(patch) => handleUpdateSubtheme(editSubtheme.id, patch)}
        />
      )}
    </div>
  );
}
