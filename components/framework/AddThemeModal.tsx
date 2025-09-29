"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listThemeCatalogue } from "@/lib/services/framework";

type CatalogueSubtheme = {
  id: string;
  name: string;
  description?: string;
};

type CatalogueTheme = {
  id: string;
  name: string;
  description?: string;
  subthemes: CatalogueSubtheme[];
};

type Props = {
  versionId: string;
  parentPillarId: string; // attach theme under this pillar
  existingThemeIds: string[];
  existingSubthemeIds: string[];
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CatalogueTheme[] }
      | { mode: "new"; name: string; description: string }
  ) => void;
};

export default function AddThemeModal({
  versionId,
  parentPillarId,
  existingThemeIds,
  existingSubthemeIds,
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CatalogueTheme[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listThemeCatalogue(versionId, parentPillarId);

        // ✅ Normalize to ensure subthemes always exist
        const normalized = (data ?? []).map((t: any) => ({
          ...t,
          subthemes: t.subthemes ?? [],
        }));

        setCatalogue(normalized);
      } catch (err: any) {
        console.error("Error loading theme catalogue:", err.message);
      }
    }
    load();
  }, [versionId, parentPillarId]);

  function toggleSelect(id: string, children: string[] = []) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        children.forEach((c) => newSet.delete(c));
      } else {
        newSet.add(id);
        children.forEach((c) => newSet.add(c));
      }
      return newSet;
    });
  }

  function renderSubthemes(subthemes: CatalogueSubtheme[]) {
    return (subthemes ?? []).map((s) => {
      const disabled = existingSubthemeIds.includes(s.id);
      return (
        <label
          key={s.id}
          className={`flex items-center space-x-2 pl-8 py-1 ${
            disabled ? "text-gray-400" : ""
          }`}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={selectedIds.has(s.id)}
            onChange={() => toggleSelect(s.id)}
          />
          <span>{s.name}</span>
        </label>
      );
    });
  }

  function renderThemes(themes: CatalogueTheme[]) {
    return (themes ?? []).map((t) => {
      const disabled = existingThemeIds.includes(t.id);
      const childIds = (t.subthemes ?? []).map((s) => s.id);
      return (
        <div key={t.id}>
          <label
            className={`flex items-center space-x-2 pl-4 py-1 ${
              disabled ? "text-gray-400" : ""
            }`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={selectedIds.has(t.id)}
              onChange={() => toggleSelect(t.id, childIds)}
            />
            <span className="font-medium">{t.name}</span>
          </label>
          {renderSubthemes(t.subthemes)}
        </div>
      );
    });
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Theme</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`pb-2 ${
            activeTab === "catalogue"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("catalogue")}
        >
          From Catalogue
        </button>
        <button
          className={`pb-2 ${
            activeTab === "new"
              ? "border-b-2 border-blue-600 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("new")}
        >
          Create New
        </button>
      </div>

      {activeTab === "catalogue" && (
        <div className="max-h-60 overflow-y-auto">{renderThemes(catalogue)}</div>
      )}

      {activeTab === "new" && (
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New theme name"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-4">
        <button
          className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
          onClick={() => {
            if (activeTab === "catalogue") {
              const chosen = catalogue
                .map((t) => {
                  if (
                    existingThemeIds.includes(t.id) ||
                    (!selectedIds.has(t.id) &&
                      !(t.subthemes ?? []).some((s) =>
                        selectedIds.has(s.id)
                      ))
                  ) {
                    return null;
                  }
                  return {
                    ...t,
                    subthemes: (t.subthemes ?? []).filter(
                      (s) =>
                        !existingSubthemeIds.includes(s.id) &&
                        selectedIds.has(s.id)
                    ),
                  };
                })
                .filter(Boolean) as CatalogueTheme[];

              if (chosen.length > 0) {
                onSubmit({ mode: "catalogue", items: chosen });
              }
            } else {
              if (!newName.trim()) return;
              onSubmit({
                mode: "new",
                name: newName.trim(),
                description: newDescription.trim() || "",
              });
            }
          }}
        >
          Add
        </button>
      </div>
    </Modal>
  );
}
