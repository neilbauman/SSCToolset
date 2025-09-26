"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash,
  X,
} from "lucide-react";

type Version = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

type Pillar = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type Theme = {
  id: string;
  pillar_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type Subtheme = {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export default function FrameworkEditor() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [newDraftName, setNewDraftName] = useState("Primary Framework v1");
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [subthemes, setSubthemes] = useState<Subtheme[]>([]);

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

    if (error) {
      console.error("Error loading versions:", error);
    } else {
      setVersions(data as Version[]);
    }
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

  async function loadStructure() {
    const { data: pillarData } = await supabaseBrowser
      .from("pillar_catalogue")
      .select("*")
      .order("sort_order");

    const { data: themeData } = await supabaseBrowser
      .from("theme_catalogue")
      .select("*")
      .order("sort_order");

    const { data: subthemeData } = await supabaseBrowser
      .from("subtheme_catalogue")
      .select("*")
      .order("sort_order");

    setPillars((pillarData as Pillar[]) || []);
    setThemes((themeData as Theme[]) || []);
    setSubthemes((subthemeData as Subtheme[]) || []);
  }

  async function updateSortOrder(
    type: "pillar" | "theme" | "subtheme",
    id: string,
    value: number
  ) {
    const table =
      type === "pillar"
        ? "pillar_catalogue"
        : type === "theme"
        ? "theme_catalogue"
        : "subtheme_catalogue";

    const { error } = await supabaseBrowser
      .from(table)
      .update({ sort_order: value })
      .eq("id", id);

    if (error) console.error("Error updating sort order:", error);
    else loadStructure();
  }

  function formatRefCode(
    type: "pillar" | "theme" | "subtheme",
    pillarSort: number,
    themeSort?: number,
    subthemeSort?: number
  ) {
    if (type === "pillar") return `P${pillarSort}`;
    if (type === "theme") return `T${pillarSort}.${themeSort}`;
    if (type === "subtheme") return `ST${pillarSort}.${themeSort}.${subthemeSort}`;
    return "";
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

  function expandAll() {
    setExpandedPillars(pillars.map((p) => p.id));
    setExpandedThemes(themes.map((t) => t.id));
  }

  function collapseAll() {
    setExpandedPillars([]);
    setExpandedThemes([]);
  }

  return (
    <div className="space-y-6">
      {/* New Draft Form */}
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
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
              Name
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
              Created
            </th>
            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-2 text-sm">
                <button
                  onClick={() => {
                    setSelectedVersion(v);
                    loadStructure();
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

      {/* Version Structure Table */}
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
              {pillars.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm font-medium text-[#003764]">
                    {formatRefCode("pillar", p.sort_order)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && (
                      <div className="text-sm text-gray-600">{p.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editMode ? (
                      <input
                        type="number"
                        defaultValue={p.sort_order}
                        onBlur={(e) =>
                          updateSortOrder("pillar", p.id, Number(e.target.value))
                        }
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
