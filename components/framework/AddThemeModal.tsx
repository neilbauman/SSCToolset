// components/framework/AddThemeModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listThemeCatalogue,
  createTheme,
} from "@/lib/services/framework";
import type {
  CatalogueTheme,
  NormalizedFramework,
} from "@/lib/types/framework";

type Props = {
  parentId: string; // pillar id
  onClose: () => void;
  onAdded: (themes: NormalizedFramework[]) => void;
  existingIds?: string[];
};

export default function AddThemeModal({
  parentId,
  onClose,
  onAdded,
  existingIds = [],
}: Props) {
  const [tab, setTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueTheme[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeChildren, setIncludeChildren] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function load() {
      const themes = await listThemeCatalogue("", parentId);
      setCatalogue(themes);
    }
    load();
  }, [parentId]);

  const handleSubmit = async () => {
    if (tab === "catalogue") {
      const themes = catalogue
        .filter((t) => selected.has(t.id))
        .map<NormalizedFramework>((t, idx) => ({
          id: t.id,
          type: "theme",
          name: t.name,
          description: t.description ?? "",
          color: null,
          icon: null,
          sort_order: idx + 1,
          ref_code: `T${idx + 1}`,
          subthemes: includeChildren ? [] : [],
        }));
      onAdded(themes);
    } else {
      const created = await createTheme(parentId, name, description);
      const newTheme: NormalizedFramework = {
        id: created.id,
        type: "theme",
        name: created.name,
        description: created.description ?? "",
        color: null,
        icon: null,
        sort_order: 999,
        ref_code: "T?",
        subthemes: [],
      };
      onAdded([newTheme]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 w-[500px]">
        <h2 className="text-lg font-semibold mb-3">Add Theme</h2>
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
            New Theme
          </button>
        </div>

        {tab === "catalogue" && (
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((t) => {
              const disabled = existingIds.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 p-1 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={selected.has(t.id)}
                    onChange={(e) => {
                      const copy = new Set(selected);
                      if (e.target.checked) copy.add(t.id);
                      else copy.delete(t.id);
                      setSelected(copy);
                    }}
                  />
                  <span>{t.name}</span>
                </label>
              );
            })}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
              />
              <span className="text-sm">Include Subthemes</span>
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
