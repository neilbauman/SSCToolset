"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";

type Version = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

export default function FrameworkEditor() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [newDraftName, setNewDraftName] = useState("Primary Framework v1");

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
    }
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
              <td className="px-4 py-2 text-sm text-brand-700 hover:underline cursor-pointer">
                {v.name}
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
    </div>
  );
}
