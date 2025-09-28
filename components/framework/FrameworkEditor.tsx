"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FrameworkEditor from "./FrameworkEditor";

type Version = {
  id: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
};

export default function PrimaryFrameworkClient({
  versions,
  openedId,
}: {
  versions: Version[];
  openedId: string;
}) {
  const router = useRouter();
  const [allVersions, setAllVersions] = useState<Version[]>(versions);
  const [currentId, setCurrentId] = useState<string>(openedId);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setAllVersions(versions);
    setCurrentId(openedId);
  }, [versions, openedId]);

  async function handleNewVersion() {
    try {
      const res = await fetch("/api/framework/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName || "New Framework Draft" }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);

      setAllVersions((prev) => [data, ...prev]);
      setCurrentId(data.id);
      setShowNewModal(false);

      // refresh page with new version
      router.push(`/configuration/primary?version=${data.id}`);
    } catch (err) {
      console.error("Failed to create new version", err);
      alert("Failed to create new version");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={currentId}
          onChange={(e) =>
            router.push(`/configuration/primary?version=${e.target.value}`)
          }
          className="border rounded px-2 py-1"
        >
          {allVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.status === "draft" ? "(Draft)" : "(Published)"}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={() => {
            setNewName("");
            setShowNewModal(true);
          }}
        >
          + New Draft
        </button>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-2">Create New Draft Version</h2>
            <input
              type="text"
              placeholder="Draft name"
              className="border rounded w-full px-2 py-1 mb-4"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={handleNewVersion}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <FrameworkEditor versionId={currentId} />
    </div>
  );
}
