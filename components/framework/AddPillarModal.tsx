"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listPillarCatalogue } from "@/lib/services/framework";

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

type CataloguePillar = {
  id: string;
  name: string;
  description?: string;
  themes: CatalogueTheme[];
};

type Props = {
  versionId: string;
  // We’ll receive ALL existing ids (pillars/themes/subthemes) here for greying-out
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

        // ✅ Normalize everything to arrays + default strings to prevent .map() crashes
        const normalized: CataloguePillar[] = (Array.isArray(data) ? data : []).map(
          (p: any) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            description: p.description ?? "",
            themes: (Array.isArray(p.themes) ? p.themes : []).map((t: any) => ({
              id: String(t.id),
              name: String(t.name ?? ""),
              description: t.description ?? "",
              subthemes: (Array.isArray(t.subthemes) ? t.subthemes : []).map(
                (s: any) => ({
                  id: String(s.id),
                  name: String(s.name ?? ""),
                  description: s.description ?? "",
                })
              ),
            })),
          })
        );

        setCatalogue(normalized);
      } catch (err: any) {
        console.error("Error loading catalogue:", err.message);
        setCatalogue([]);
      }
    }
    load();
  }, [versionId]);

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
    return (subthemes || []).map((s) => {
      const disabled = existingPillarIds.includes(s.id);
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
    return (themes || []).map((t) => {
      const disabled = existingPillarIds.includes(t.id);
      const childIds = (t.subthemes || []).map((s) => s.id);
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
           
