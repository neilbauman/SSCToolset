// components/framework/AddSubthemeModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listSubthemeCatalogue,
  createSubtheme,
} from "@/lib/services/framework";
import type {
  CatalogueSubtheme,
  NormalizedFramework,
} from "@/lib/types/framework";

type Props = {
  parentId: string; // theme id
  onClose: () => void;
  onAdded: (subthemes: NormalizedFramework[]) => void;
  existingIds?: string[];
};

export default function AddSubthemeModal({
  parentId,
  onClose,
  onAdded,
  existingIds = [],
}: Props) {
  const [tab, setTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueSubtheme[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const subs = await listSubthemeCatalogue("", parentId);
      setCatalogue(subs);
    }
    load();
  }, [parentId]);

  const handleSubmit = async () => {
    if (tab === "catalogue") {
      const subs = catalogue
        .filter((s) => selected.has(s.id))
        .map<NormalizedFramework>((s, idx) => ({
          id: s.id,
          type: "subtheme",
          name: s.name,
          description: s.description ?? "",
          color: null,
          icon: null,
          sort_order: idx + 1,
          ref_code: `ST${idx + 1}`,
        }));
      onAdded(subs);
    } else {
      const created = await createSubtheme(parentId, name, description);
      const newSub: NormalizedFramework = {
        id: created.id,
        type: "subtheme",
        name: created.name,
        description: created.description ?? "",
        color: null,
        icon: null,
        sort_order: 999,
        ref_code: "ST?",
      };
      onAdded([newSub]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 w-[500px]">
        <h2 className="text-lg font-semibold mb-3">Add Subtheme</h2>
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
            New Subtheme
          </button>
        </div>

        {tab === "catalogue" && (
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((s) => {
              const disabled = existingIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 p-1 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={selected.has(s.id)}
                    onChange={(e) => {
                      const copy = new Set(selected);
                      if (e.target.checked) copy.add(s.id);
                      else copy.delete(s.id);
                      setSelected(copy);
                    }}
                  />
                  <span>{s.name}</span>
                </label>
              );
            })}
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
