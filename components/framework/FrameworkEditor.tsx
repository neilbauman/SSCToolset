"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import { ChevronDown, ChevronRight, Pencil, Trash, X } from "lucide-react";

type Version = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  pillar?: { id: string; name: string; description: string | null } | null;
  theme?: {
    id: string;
    name: string;
    description: string | null;
    pillar_id: string;
  } | null;
  subtheme?: {
    id: string;
    name: string;
    description: string | null;
    theme_id: string;
  } | null;
};

export default function FrameworkEditor() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [newDraftName, setNewDraftName] = useState("Primary Framework v1");
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [items, setItems] = useState<FrameworkItem[]>([]);

  const [expandedPillars, setExpandedPillars] = useState<string[]>([]);
  const [expandedThemes, setExpandedThemes] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    const { data, error } = await supabaseBrowser
      .from("framework_versions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error loading versions:", error);
    else setVersions(data as Version[]);
  }

  async function createDraft() {
    const { error } = await supabaseBrowser.from("framework_versions").insert({
      name: newDraftName,
      status: "draft",
    });

    if (error) {
      console.error("Error creating draft:", error);
    } else {
      setNewDraftName(`Primary Framework v${versions.length + 2}`);
      loadVersions();
    }
  }

  async function publishVersion(id: string) {
    const { error } = await supabaseBrowser
      .from("framework_versions")
      .update({ status: "published" })
      .eq("id", id);

    if (error) console.error("Error publishing version:", error);
    else loadVersions();
  }

  async function cloneVersion(id: string) {
    const version = versions.find((v) => v.id === id);
    if (!version) return;

    const newName = `${version.name} (copy)`;

    const { error } = await supabaseBrowser.from("framework_versions").insert({
      name: newName,
      status: "draft",
    });

    if (error) console.error("Error cloning version:", error);
    else loadVersions();
  }

  async function deleteVersion(id: string) {
    const confirmed = window.confirm("Delete this version?");
    if (!confirmed) return;

    const { error } = await supabaseBrowser
      .from("framework_versions")
      .delete()
      .eq("id", id);

    if (error) console.error("Error deleting version:", error);
    else {
      loadVersions();
      if (selectedVersion?.id === id) setSelectedVersion(null);
    }
  }

  async function loadStructure(versionId: string) {
    const { data, error } = await supabaseBrowser
      .from("framework_version_items")
      .select(
        `
        id, version_id, sort_order,
        pillar_id, theme_id, subtheme_id,
        pillar:pillar_id (id, name, description),
        theme:theme_id (id, name, description, pillar_id),
        subtheme:subtheme_id (id, name, description, theme_id)
      `
      )
      .eq("version_id", versionId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading structure:", error);
    } else {
      const normalized = (data || []).map((row: any) => ({
        ...row,
        pillar: row.pillar?.[0] || null,
        theme: row.theme?.[0] || null,
        subtheme: row.subtheme?.[0] || null,
      }));
      setItems(normalized as FrameworkItem[]);
    }
  }

  async function updateSortOrder(id: string, newValue: number) {
    const { error } = await supabaseBrowser
      .from("framework_version_items")
      .update({ sort_order: newValue })
      .eq("id", id);

    if (error) console.error("Error updating sort order:", error);
    else if (selectedVersion) loadStructure(selectedVersion.id);
  }

  function expandAll() {
    const pIds = items.filter((i) => i.pillar_id).map((i) => i.id);
    const tIds = items.filter((i) => i.theme_id).map((i) => i.id);
    setExpandedPillars(pIds);
    setExpandedThemes(tIds);
  }

  function collapseAll() {
    setExpandedPillars([]);
    setExpandedThemes([]);
  }

  function togglePillar(id: string) {
    setExpandedPillars((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTheme(id: string) {
    setExpandedThemes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function formatRefCode(
    type: "pillar" | "theme" | "subtheme",
    pSort: number,
    tSort?: number,
    sSort?: number
  ) {
    if (type === "pillar") return `P${pSort}`;
    if (type === "theme") return `T${pSort}.${tSort}`;
    if (type === "subtheme") return `ST${pSort}.${tSort}.${sSort}`;
    return "";
  }

  // --- Build hierarchy -----------------------------------------------------
  const pillars = items.filter((i) => i.pillar_id && !i.theme_id && !i.subtheme_id);
  const themes = items.filter((i) => i.theme_id && !i.subtheme_id);
  const subthemes = items.filter((i) => i.subtheme_id);

  return (
    <div className="space-y-6">
      {/* Create Draft */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={newDraftName}
          onChange={(e) => setNewDraftName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="New Draft Name"
        />
        <button
          onClick={createDraft}
          className="px-4 py-2 rounded-md bg-[#630710] text-white text-sm hover:bg-red-800"
        >
          Create Draft from Catalogue
        </button>
      </div>

      {/* Versions Table */}
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Created</th>
            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-2 text-sm">
                <button
                  onClick={() => {
                    setSelectedVersion(v);
                    loadStructure(v.id);
                  }}
                  className="text-[#003764] hover:underline"
                >
                  {v.name}
                </button>
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    v.status === "published"
                      ? "bg-green-100 text-[#00b398]"
                      : "bg-orange-100 text-[#f3732c]"
                  }`}
                >
                  {v.status}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-600">
                {new Date(v.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-2 text-right space-x-2">
                {v.status === "draft" && (
                  <button
                    onClick={() => publishVersion(v.id)}
                    className="px-3 py-1 rounded-md bg-[#630710] text-white text-xs hover:bg-red-800"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => cloneVersion(v.id)}
                  className="px-3 py-1 rounded-md bg-[#0082cb] text-white text-xs hover:bg-blue-700"
                >
                  Clone
                </button>
                <button
                  onClick={() => deleteVersion(v.id)}
                  className="px-3 py-1 rounded-md bg-[#f3732c] text-white text-xs hover:bg-orange-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Version Structure */}
      {selectedVersion && (
        <div className="mt-8 border rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#630710]">
              Version Structure: {selectedVersion.name}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="flex items-center gap-1 px-3 py-1 rounded-md border text-sm text-gray-700 hover:bg-gray-100"
              >
                <ChevronDown className="w-4 h-4" /> Expand All
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 px-3 py-1 rounded-md border text-sm text-gray-700 hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" /> Collapse All
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-[#0082cb] text-white text-sm hover:bg-blue-700"
              >
                {editMode ? (
                  <>
                    <X className="w-4 h-4" /> Exit Edit Mode
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" /> Enter Edit Mode
                  </>
                )}
              </button>
            </div>
          </div>

          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Type/Ref Code
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Name/Description
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Sort Order
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pillars.map((p) => {
                const tChildren = themes.filter((t) => t.theme?.pillar_id === p.pillar_id);
                const isPExpanded = expandedPillars.includes(p.id);
                const pRef = formatRefCode("pillar", p.sort_order);

                return (
                  <>
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-sm font-medium text-[#003764]">
                        <button onClick={() => togglePillar(p.id)} className="mr-2">
                          {isPExpanded ? (
                            <ChevronDown className="w-4 h-4 inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 inline" />
                          )}
                        </button>
                        {pRef}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{p.pillar?.name}</div>
                        {p.pillar?.description && (
                          <div className="text-sm text-gray-600">{p.pillar.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editMode ? (
                          <input
                            type="number"
                            defaultValue={p.sort_order}
                            onBlur={(e) => updateSortOrder(p.id, Number(e.target.value))}
                            className="w-16 rounded border px-2 py-1 text-sm"
                          />
                        ) : (
                          <span>{p.sort_order}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editMode && (
                          <button className="text-red-600 hover:text-red-800">
                            <Trash className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>

                    {isPExpanded &&
                      tChildren.map((t) => {
                        const sChildren = subthemes.filter(
                          (s) => s.subtheme?.theme_id === t.theme?.id
                        );
                        const isTExpanded = expandedThemes.includes(t.id);
                        const tRef = formatRefCode("theme", p.sort_order, t.sort_order);

                        return (
                          <>
                            <tr key={t.id}>
                              <td className="px-4 py-2 text-sm pl-8 text-[#003764]">
                                <button onClick={() => toggleTheme(t.id)} className="mr-2">
                                  {isTExpanded ? (
                                    <ChevronDown className="w-4 h-4 inline" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 inline" />
                                  )}
                                </button>
                                {tRef}
                              </td>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900">{t.theme?.name}</div>
                                {t.theme?.description && (
                                  <div className="text-sm text-gray-600">{t.theme.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {editMode ? (
                                  <input
                                    type="number"
                                    defaultValue={t.sort_order}
                                    onBlur={(e) => updateSortOrder(t.id, Number(e.target.value))}
                                    className="w-16 rounded border px-2 py-1 text-sm"
                                  />
                                ) : (
                                  <span>{t.sort_order}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {editMode && (
                                  <button className="text-red-600 hover:text-red-800">
                                    <Trash className="w-4 h-4 inline" />
                                  </button>
                                )}
                              </td>
                            </tr>

                            {isTExpanded &&
                              sChildren.map((s) => {
                                const sRef = formatRefCode(
                                  "subtheme",
                                  p.sort_order,
                                  t.sort_order,
                                  s.sort_order
                                );
                                return (
                                  <tr key={s.id}>
                                    <td className="px-4 py-2 text-sm pl-14 text-[#003764]">
                                      {sRef}
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="font-medium text-gray-900">
                                        {s.subtheme?.name}
                                      </div>
                                      {s.subtheme?.description && (
                                        <div className="text-sm text-gray-600">
                                          {s.subtheme.description}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">
                                      {editMode ? (
                                        <input
                                          type="number"
                                          defaultValue={s.sort_order}
                                          onBlur={(e) =>
                                            updateSortOrder(s.id, Number(e.target.value))
                                          }
                                          className="w-16 rounded border px-2 py-1 text-sm"
                                        />
                                      ) : (
                                        <span>{s.sort_order}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {editMode && (
                                        <button className="text-red-600 hover:text-red-800">
                                          <Trash className="w-4 h-4 inline" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </>
                        );
                      })}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
