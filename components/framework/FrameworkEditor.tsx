"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";

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
};

type Theme = {
  id: string;
  pillar_id: string;
  name: string;
  description: string | null;
};

type Subtheme = {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
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

    if (error) {
      console.error("Error publishing version:", error);
    } else {
      loadVersions();
    }
  }

  async function cloneVersion(id: string) {
    const version = versions.find((v) => v.id === id);
    if (!version) return;

    const newName = `${version.name} (copy)`;

    const { error } = await supabaseBrowser.from("framework_versions").insert({
      name: newName,
      status: "draft",
    });

    if (error) {
      console.error("Error cloning version:", error);
    } else {
      loadVersions();
    }
  }

  async function deleteVersion(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this version?"
    );
    if (!confirmed) return;

    const { error } = await supabaseBrowser
      .from("framework_versions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting version:", error);
    } else {
      loadVersions();
      if (selectedVersion?.id === id) {
        setSelectedVersion(null);
      }
    }
  }

  async function loadStructure() {
    const { data: pillarData } = await supabaseBrowser
      .from("pillar_catalogue")
      .select("*")
      .order("name");

    const { data: themeData } = await supabaseBrowser
      .from("theme_catalogue")
      .select("*")
      .order("name");

    const { data: subthemeData } = await supabaseBrowser
      .from("subtheme_catalogue")
      .select("*")
      .order("name");

    setPillars((pillarData as Pillar[]) || []);
    setThemes((themeData as Theme[]) || []);
    setSubthemes((subthemeData as Subtheme[]) || []);
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
          className="px-4 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
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
                  className="text-brand-700 hover:underline"
                >
                  {v.name}
                </button>
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    v.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
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
                    className="px-3 py-1 rounded-md bg-green-600 text-white text-xs hover:bg-green-700"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => cloneVersion(v.id)}
                  className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Clone
                </button>
                <button
                  onClick={() => deleteVersion(v.id)}
                  className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Version Structure Tree */}
      {selectedVersion && (
        <div className="mt-8 border rounded-lg bg-white p-4">
          <h3 className="text-lg font-semibold mb-4">
            Version Structure: {selectedVersion.name}
          </h3>
          <ul className="space-y-2">
            {pillars.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => togglePillar(p.id)}
                  className="text-left font-medium text-gray-800 hover:underline"
                >
                  {expandedPillars.includes(p.id) ? "▼" : "▶"} {p.name}
                </button>
                {expandedPillars.includes(p.id) && (
                  <ul className="ml-6 mt-2 space-y-1">
                    {themes
                      .filter((t) => t.pillar_id === p.id)
                      .map((t) => (
                        <li key={t.id}>
                          <button
                            onClick={() => toggleTheme(t.id)}
                            className="text-left text-gray-700 hover:underline"
                          >
                            {expandedThemes.includes(t.id) ? "▼" : "▶"}{" "}
                            {t.name}
                          </button>
                          {expandedThemes.includes(t.id) && (
                            <ul className="ml-6 mt-1 space-y-1">
                              {subthemes
                                .filter((s) => s.theme_id === t.id)
                                .map((s) => (
                                  <li
                                    key={s.id}
                                    className="text-gray-600 text-sm"
                                  >
                                    • {s.name}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
