"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listSubthemeCatalogue, createSubtheme } from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
  themeId: string;
  existing: NormalizedFramework[];
  onClose: () => void;
  onAdd: (subtheme: NormalizedFramework) => void;
};

export default function AddSubthemeModal({
  versionId,
  themeId,
  existing,
  onClose,
  onAdd,
}: Props) {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [mode, setMode] = useState<"catalogue" | "new">("catalogue");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const data = await listSubthemeCatalogue(versionId, themeId);
      setCatalogue(data || []);
    }
    load();
  }, [versionId, themeId]);

  async function handleSubmit() {
    if (mode === "catalogue") {
      const selected = catalogue.filter((c) => selectedIds.includes(c.id));
      for (const c of selected) {
        const sub: NormalizedFramework = {
          id: c.id,
          type: "subtheme",
          name: c.name,
          description: c.description,
          sort_order: (existing.length || 0) + 1,
          ref_code: c.ref_code ?? `ST${themeId}.${existing.length + 1}`,
          color: null,
          icon: null,
        };
        onAdd(sub);
      }
      onClose();
    } else {
      if (!name.trim()) return;
      const created = await createSubtheme(themeId, name.trim(), description);
      const newSub: NormalizedFramework = {
        id: created.id,
        type: "subtheme",
        name: created.name,
        description: created.description,
        sort_order: (existing.length || 0) + 1,
        ref_code: created.ref_code ?? `ST${themeId}.${existing.length + 1}`,
        color: null,
        icon: null,
      };
      onAdd(newSub);
      onClose();
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Subtheme</h2>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${
            mode === "catalogue" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("catalogue")}
        >
          From Catalogue
        </button>
        <button
          className={`px-3 py-1 rounded ${
            mode === "new" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setMode("new")}
        >
          New
        </button>
      </div>

      {mode === "catalogue" ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {catalogue.map((c) => {
            const already = existing.some((e) => e.id === c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 p-2 rounded ${
                  already ? "opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={already}
                  checked={selectedIds.includes(c.id)}
                  onChange={(e) =>
                    setSelectedIds((prev) =>
                      e.target.checked
                        ? [...prev, c.id]
                        : prev.filter((id) => id !== c.id)
                    )
                  }
                />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.description}</div>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subtheme name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Subtheme description"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleSubmit}
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
