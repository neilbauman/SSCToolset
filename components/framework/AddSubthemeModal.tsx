// components/framework/AddSubthemeModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  listSubthemeCatalogue,
  createSubtheme,
} from "@/lib/services/framework";
import type { NormalizedFramework, CatalogueSubtheme } from "@/lib/types/framework";

type Props = {
  versionId: string;
  parent: NormalizedFramework; // parent Theme
  onClose: () => void;
  onAdd: (subtheme: NormalizedFramework) => void;
};

export default function AddSubthemeModal({
  versionId,
  parent,
  onClose,
  onAdd,
}: Props) {
  const [tab, setTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueSubtheme[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    listSubthemeCatalogue(versionId, parent.id)
      .then(setCatalogue)
      .catch(console.error);
  }, [versionId, parent.id]);

  const handleSubmit = async () => {
    if (tab === "catalogue") {
      for (const id of selected) {
        const cat = catalogue.find((c) => c.id === id);
        if (cat) {
          onAdd({
            id: cat.id,
            type: "subtheme",
            name: cat.name,
            description: cat.description ?? "",
            color: null,
            icon: null,
            sort_order: (parent.subthemes?.length ?? 0) + 1,
            ref_code: `${parent.ref_code}.ST${(parent.subthemes?.length ?? 0) + 1}`,
          });
        }
      }
    } else {
      const created = await createSubtheme(parent.id, name, description);
      onAdd({
        id: created.id,
        type: "subtheme",
        name: created.name,
        description: created.description ?? "",
        color: null,
        icon: null,
        sort_order: (parent.subthemes?.length ?? 0) + 1,
        ref_code: `${parent.ref_code}.ST${(parent.subthemes?.length ?? 0) + 1}`,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-4 rounded shadow w-96 space-y-4">
        <h3 className="font-semibold text-lg">Add Subtheme to {parent.name}</h3>
        <div className="flex gap-2">
          <button
            className={`flex-1 px-2 py-1 rounded ${tab === "catalogue" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("catalogue")}
          >
            From Catalogue
          </button>
          <button
            className={`flex-1 px-2 py-1 rounded ${tab === "new" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("new")}
          >
            New Subtheme
          </button>
        </div>

        {tab === "catalogue" ? (
          <div className="max-h-64 overflow-y-auto border p-2">
            {catalogue.map((c) => {
              const already = parent.subthemes?.some((s) => s.id === c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 p-1 ${already ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    disabled={already}
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const copy = new Set(selected);
                      if (e.target.checked) copy.add(c.id);
                      else copy.delete(c.id);
                      setSelected(copy);
                    }}
                  />
                  <span>{c.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              className="border rounded px-2 py-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              placeholder="Description"
              className="border rounded px-2 py-1 w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
