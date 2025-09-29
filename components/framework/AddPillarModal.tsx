"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listPillarCatalogue } from "@/lib/services/framework";

type CatalogueSubtheme = {
  id: string;
  name: string;
  description: string;
};

type CatalogueTheme = {
  id: string;
  name: string;
  description: string;
  subthemes: CatalogueSubtheme[];
};

type CataloguePillar = {
  id: string;
  name: string;
  description: string;
  themes: CatalogueTheme[];
};

type Props = {
  versionId: string;
  existingPillarIds: string[];
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CataloguePillar[] }
      | { mode: "new"; name: string; description: string }
  ) => void;
};

export default function AddPillarModal({
  versionId,
  existingPillarIds,
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState<"catalogue" | "new">("catalogue");
  const [catalogue, setCatalogue] = useState<CataloguePillar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await listPillarCatalogue(versionId);
        setCatalogue(
          (data ?? []).map((p: any) => ({
            ...p,
            description: p.description ?? "",
            themes: (p.themes ?? []).map((t: any) => ({
              ...t,
              description: t.description ?? "",
              subthemes: (t.subthemes ?? []).map((s: any) => ({
                ...s,
                description: s.description ?? "",
              })),
            })),
          }))
        );
      } catch (err: any) {
        console.error("Error loading catalogue:", err.message);
      }
    }
    load();
  }, [versionId]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  function renderSubthemes(subthemes: CatalogueSubtheme[], depth = 2) {
    return subthemes.map((s) => {
      const disabled = existingPillarIds.includes(s.id);
      return (
        <label
          key={s.id}
          className={`flex items-center space-x-2 pl-${depth * 2} py-1 ${
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

  function renderThemes(themes: CatalogueTheme[], depth = 1) {
    return themes.map((t) => (
      <div key={t.id}>
        <label className={`flex items-center space-x-2 pl-${depth * 2} py-1`}>
          <input
            type="checkbox"
            checked={selectedIds.has(t.id)}
            onChange={() => toggleSelect(t.id)}
          />
          <span>{t.name}</span>
        </label>
        {renderSubthemes(t.subthemes, depth + 1)}
      </div>
    ));
  }

  function renderPillars(pillars: CataloguePillar[]) {
    return pillars.map((p) => {
      const disabled = existingPillarIds.includes(p.id);
      return (
        <div key={p.id} className="mb-2">
          <label
            className={`flex items-center space-x-2 py-1 ${
              disabled ? "text-gray-400" : ""
            }`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={selectedIds.has(p.id)}
              onChange={() => toggleSelect(p.id)}
            />
            <span className="font-medium">{p.name}</span>
          </label>
          {renderThemes(p.themes)}
        </div>
      );
    });
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Pillar</h2>

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
        <div className="max-h-60 overflow-y-auto">{renderPillars(catalogue)}</div>
      )}

      {activeTab === "new" && (
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New pillar name"
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
              const chosen = catalogue.filter(
                (p) =>
                  selectedIds.has(p.id) ||
                  p.themes.some(
                    (t) =>
                      selectedIds.has(t.id) ||
                      t.subthemes.some((s) => selectedIds.has(s.id))
                  )
              );
              if (chosen.length === 0) return;
              onSubmit({ mode: "catalogue", items: chosen });
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
