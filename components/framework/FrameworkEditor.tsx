"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronRight,
  ChevronDown,
  Edit,
  Trash,
  Plus,
  GripVertical,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type Props = {
  tree: NormalizedFramework[];
  versionId?: string; // passed in by PrimaryFrameworkClient
};

type CataloguePillar = {
  id: string;
  name: string;
  description: string | null;
  can_have_indicators: boolean | null;
  alreadyIn: boolean;
};

export default function FrameworkEditor({ tree, versionId }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  // Add Pillar modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [tab, setTab] = useState<"catalogue" | "new">("catalogue");
  const [search, setSearch] = useState("");
  const [includeChildren, setIncludeChildren] = useState(true);

  const [catalogue, setCatalogue] = useState<CataloguePillar[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { addToast } = useToast();

  useEffect(() => {
    if (!showAddModal || !versionId || tab !== "catalogue") return;
    const run = async () => {
      try {
        const q = new URLSearchParams({ version: versionId });
        const res = await fetch(`/api/catalogue/pillars?${q.toString()}`);
        const json = await res.json();
        setCatalogue(json.data ?? []);
      } catch (e) {
        console.error(e);
        addToast("Failed to load catalogue", "error");
      }
    };
    run();
  }, [showAddModal, versionId, tab, addToast]);

  const filteredCatalogue = useMemo(() => {
    if (!catalogue) return [];
    const q = search.trim().toLowerCase();
    const base = q
      ? catalogue.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q)
        )
      : catalogue;
    return base;
  }, [catalogue, search]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAdd = async () => {
    if (!versionId) {
      addToast("No version selected", "error");
      return;
    }

    try {
      if (tab === "catalogue" && selectedId) {
        const res = await fetch("/api/catalogue/pillars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId,
            existingId: selectedId,
            includeChildren,
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        addToast("Pillar added from catalogue", "success");
      } else if (tab === "new" && name.trim()) {
        const res = await fetch("/api/catalogue/pillars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId,
            name: name.trim(),
            description: description || null,
            includeChildren: false,
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        addToast("New pillar created", "success");
      }
      // Soft reset modal
      setShowAddModal(false);
      setSelectedId(null);
      setName("");
      setDescription("");
      setIncludeChildren(true);

      // NOTE: We rely on page-level reload or a refetch in PrimaryFrameworkClient
      // to refresh the tree. Keeping UI drift to a minimum per your guardrails.
      window.location.reload();
    } catch (e: any) {
      console.error("Failed to add pillar", e);
      addToast(e?.message ?? "Error adding pillar", "error");
    }
  };

  const renderRows = (
    items: any[],
    level: number = 0,
    parentRef: string = ""
  ): JSX.Element[] => {
    return items.flatMap((item, index) => {
      const refCode =
        level === 0 ? `P${index + 1}` : `${parentRef}.${index + 1}`;
      const isExpanded = expanded[item.id];

      const hasChildren =
        (level === 0 && item.themes && item.themes.length > 0) ||
        (level === 1 && item.subthemes && item.subthemes.length > 0);

      const indent = level === 2 ? level * 16 : level * 12;

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="px-2 py-2 text-sm align-top w-[20%]">
            <div className="flex items-center" style={{ marginLeft: indent }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  level === 0
                    ? "bg-blue-100 text-blue-800"
                    : level === 1
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="ml-2 text-xs text-gray-500 font-mono">
                {refCode}
              </span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="px-4 py-2 text-sm w-[55%]">
            <div style={{ marginLeft: indent }}>
              <div className="font-medium text-gray-900">{item.name}</div>
              {item.description && (
                <div className="text-gray-500 text-xs">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order (UI-relative index) */}
          <td className="px-2 py-2 text-sm text-center w-[10%]">
            {index + 1}
          </td>

          {/* Actions */}
          <td className="px-2 py-2 text-sm text-right w-[15%]">
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="text-gray-400 cursor-not-allowed">
                  <GripVertical size={16} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Edit size={16} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Trash size={16} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </td>
        </tr>
      );

      const children: JSX.Element[] = [];
      if (isExpanded && hasChildren) {
        if (level === 0 && item.themes) {
          children.push(...renderRows(item.themes, 1, refCode));
        }
        if (level === 1 && item.subthemes) {
          children.push(...renderRows(item.subthemes, 2, refCode));
        }
      }

      return [row, ...children];
    });
  };

  return (
    <div>
      <div className="mb-2 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          {editMode && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Pillar
            </button>
          )}
          <button
            onClick={() => setExpanded({})}
            className="text-xs text-gray-600 hover:underline"
          >
            Collapse all
          </button>
          <button
            onClick={() => {
              const allExpanded: Record<string, boolean> = {};
              tree.forEach((pillar) => {
                allExpanded[pillar.id] = true;
                pillar.themes?.forEach((theme: any) => {
                  allExpanded[theme.id] = true;
                  theme.subthemes?.forEach(
                    (st: any) => (allExpanded[st.id] = true)
                  );
                });
              });
              setExpanded(allExpanded);
            }}
            className="text-xs text-gray-600 hover:underline"
          >
            Expand all
          </button>
        </div>
        <button
          onClick={() => setEditMode((prev) => !prev)}
          className="text-xs text-gray-600 hover:underline"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
            <th className="px-2 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-4 py-2 w-[55%]">Name / Description</th>
            <th className="px-2 py-2 text-center w-[10%]">Sort Order</th>
            <th className="px-2 py-2 text-right w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>

      {/* Add Pillar Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Add Pillar</h2>

        <div className="border-b mb-4">
          <nav className="flex space-x-4 text-sm">
            <button
              className={`pb-2 ${
                tab === "catalogue" ? "border-b-2 border-blue-600" : ""
              }`}
              onClick={() => setTab("catalogue")}
            >
              From Catalogue
            </button>
            <button
              className={`pb-2 ${
                tab === "new" ? "border-b-2 border-blue-600" : ""
              }`}
              onClick={() => setTab("new")}
            >
              Create New
            </button>
          </nav>
        </div>

        {tab === "catalogue" && (
          <div>
            <input
              type="text"
              placeholder="Search catalogue..."
              className="w-full border rounded px-2 py-1 text-sm mb-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ul className="max-h-48 overflow-y-auto border rounded divide-y">
              {filteredCatalogue.map((pillar) => (
                <li
                  key={pillar.id}
                  className={`px-2 py-2 flex items-start gap-2 ${
                    pillar.alreadyIn
                      ? "text-gray-400 bg-gray-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={pillar.alreadyIn}
                    checked={selectedId === pillar.id}
                    onChange={() =>
                      !pillar.alreadyIn &&
                      setSelectedId(
                        selectedId === pillar.id ? null : pillar.id
                      )
                    }
                  />
                  <div>
                    <div className="font-medium text-sm">{pillar.name}</div>
                    {pillar.description && (
                      <div className="text-xs text-gray-500">
                        {pillar.description}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {filteredCatalogue.length === 0 && (
                <li className="px-2 py-2 text-xs text-gray-500">
                  No results
                </li>
              )}
            </ul>

            {selectedId && (
              <label className="mt-3 flex items-center text-sm">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={includeChildren}
                  onChange={(e) => setIncludeChildren(e.target.checked)}
                />
                Include child Themes & Subthemes
              </label>
            )}
          </div>
        )}

        {tab === "new" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Description
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              (tab === "catalogue" && selectedId) || (tab === "new" && name)
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!(tab === "catalogue" ? selectedId : name)}
            onClick={handleAdd}
          >
            Add Pillar
          </button>
        </div>
      </Modal>
    </div>
  );
}
