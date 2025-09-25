"use client";

import { useEffect, useState } from "react";

type Version = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

type Tree = Array<{
  pillar: { id: string; name: string; description: string | null };
  themes: Array<{
    theme: { id: string; name: string; description: string | null };
    subthemes: Array<{ id: string; name: string; description: string | null }>;
  }>;
}>;

export default function FrameworkEditor() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tree, setTree] = useState<Tree>([]);
  const [name, setName] = useState("Primary Framework v1");

  async function loadVersions() {
    const res = await fetch("/api/framework/versions");
    const json = await res.json();
    setVersions(json.data || []);
  }

  async function createDraft() {
    setLoading(true);
    try {
      const res = await fetch("/api/framework/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error("Failed to create draft");
      await loadVersions();
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(id: string) {
    setExpandedId(id === expandedId ? null : id);
    if (id === expandedId) return;
    const res = await fetch(`/api/framework/versions/${id}/items`);
    const json = await res.json();
    setTree(json.data || []);
  }

  async function publish(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/framework/versions/${id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Publish failed");
      await loadVersions();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVersions(); }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">New Draft Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Primary Framework vX"
            />
          </div>
          <button
            onClick={createDraft}
            disabled={loading || !name.trim()}
            className="rounded-md bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 disabled:opacity-50"
          >
            Create Draft from Catalogue
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="p-3">Name</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {versions.map(v => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <button className="underline" onClick={() => loadItems(v.id)}>{v.name}</button>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                    v.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="p-3">{new Date(v.created_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => publish(v.id)}
                    disabled={v.status === "published" || loading}
                    className="rounded-md border px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Publish
                  </button>
                </td>
              </tr>
            ))}
            {versions.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-gray-500">No versions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {expandedId && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="font-medium text-gray-900 mb-3">Version Structure</h3>
          <div className="space-y-4">
            {tree.map((p) => (
              <div key={p.pillar.id} className="border rounded-md">
                <div className="px-3 py-2 bg-gray-50 font-medium">{p.pillar.name}</div>
                <div className="p-3 space-y-2">
                  {p.themes.map((t) => (
                    <div key={t.theme.id} className="border rounded-md">
                      <div className="px-3 py-2 bg-white font-medium">{t.theme.name}</div>
                      {t.subthemes.length > 0 && (
                        <ul className="px-5 py-2 list-disc text-sm text-gray-700">
                          {t.subthemes.map(s => <li key={s.id}>{s.name}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                  {p.themes.length === 0 && <div className="text-sm text-gray-600">No themes.</div>}
                </div>
              </div>
            ))}
            {tree.length === 0 && <div className="text-sm text-gray-600">No items found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
