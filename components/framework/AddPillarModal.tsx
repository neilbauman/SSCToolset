"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listPillarCatalogue, createPillar } from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
  existing: NormalizedFramework[];
  onClose: () => void;
  onAdd: (pillar: NormalizedFramework) => void;
};

export default function AddPillarModal({
  versionId,
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
      const data = await listPillarCatalogue(versionId);
      setCatalogue(data || []);
    }
    load();
  }, [versionId]);

  async function handleSubmit() {
    if (mode === "catalogue") {
      const selected = catalogue.filter((c) => selectedIds.includes(c.id));
      for (const c of selected) {
        const sort = (existing.length || 0) + 1;
        const pillar: NormalizedFramework = {
          id: c.id,
          type: "pillar",
          name: c.name,
          description: c.description,
          sort_order: sort,
          ref_code: `P${sort}`,
          color: null,
          icon: null,
          themes: [],
        };
        onAdd(pillar);
      }
      onClose();
    } else {
      if (!name.trim()) return;
      const created = await createPillar(name.trim(), description);
      const sort = (existing.length || 0) + 1;
      const newPillar: NormalizedFramework = {
        id: created.id,
        type: "pillar",
        name: created.name,
        description: created.description,
        sort_order: sort,
        ref_code: `P${sort}`,
        color: null,
        icon: null,
        themes: [],
      };
      onAdd(newPillar);
      onClose();
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Pillar</h2>

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
            placeholder="Pillar name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pillar description"
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
