// components/framework/AddPillarModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { listPillarCatalogue, createPillar } from "@/lib/services/framework";
import type {
  CataloguePillar,
  NormalizedFramework,
} from "@/lib/types/framework";

type Props = {
  onClose: () => void;
  onAdded: (pillars: NormalizedFramework[]) => void;
  existingIds?: string[];
};

export default function AddPillarModal({
  onClose,
  onAdded,
  existingIds = [],
}: Props) {
  const [tab, setTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CataloguePillar[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeChildren, setIncludeChildren] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const pillars = await listPillarCatalogue(""); // versionId not needed at pillar level
      setCatalogue(pillars);
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (tab === "catalogue") {
      const pillars = catalogue
        .filter((p) => selected.has(p.id))
        .map<NormalizedFramework>((p, idx) => ({
          id: p.id,
          type: "pillar",
          name: p.name,
          description: p.description ?? "",
          color: null,
          icon: null,
          sort_order: idx + 1,
          ref_code: `P${idx + 1}`,
          themes: includeChildren ? [] : [],
        }));
      onAdded(pillars);
    } else {
      const created = await createPillar(name, description);
      const newPillar: NormalizedFramework = {
        id: created.id,
        type: "pillar",
        name: created.name,
        description: created.description ?? "",
        color: null,
        icon: null,
        sort_order: 999, // will be re-sorted
        ref_code: "P?",
        themes: [],
      };
      onAdded([newPillar]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 w-[500px]">
        <h2 className="text-lg font-semibold mb-3">Add Pillar</h2>
        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 rounded ${
              tab === "catalogue" ? "bg-blue-600 text-white" : "border"
            }`}
            onClick={() => setTab("catalogue")}
          >
            From Catalogue
          </button>
          <button
            className={`px-3 py-1 rounded ${
              tab === "new" ? "bg-blue-600 text-white" : "border"
            }`}
            onClick={() => setTab("new")}
          >
            New Pillar
          </button>
        </div>

        {tab === "catalogue" && (
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((p) => {
              const disabled = existingIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 p-1 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={selected.has(p.id)}
                    onChange={(e) => {
                      const copy = new Set(selected);
                      if (e.target.checked) copy.add(p.id);
                      else copy.delete(p.id);
                      setSelected(copy);
                    }}
                  />
                  <span>{p.name}</span>
                </label>
              );
            })}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
              />
              <span className="text-sm">Include Themes & Subthemes</span>
            </div>
          </div>
        )}

        {tab === "new" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border w-full px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border w-full px-2 py-1 rounded"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
