"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser"; // ✅ fixed
import { ChevronDown, ChevronRight, Pencil, Trash } from "lucide-react";

type Version = {
  id: string;
  name: string;
  created_at: string;
};

type FrameworkItem = {
  id: string;
  sort_order: number;
  pillar_id: string | null;
  pillar_name: string | null;
  pillar_description: string | null;
  theme_id: string | null;
  theme_name: string | null;
  theme_description: string | null;
  subtheme_id: string | null;
  subtheme_name: string | null;
  subtheme_description: string | null;
};

type FrameworkEditorProps = {
  version: Version;
};

export default function FrameworkEditor({ version }: FrameworkEditorProps) {
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabaseBrowser
        .from("framework_version_items")
        .select("*")
        .eq("version_id", version.id);

      if (error) {
        console.error("Error loading structure:", error);
      } else {
        setItems(data as FrameworkItem[]);
      }
    }
    loadData();
  }, [version.id]);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="mt-6 bg-white shadow rounded-lg p-4">
      <h2 className="text-md font-semibold mb-4 text-red-800">
        Version Structure: {version.name}
      </h2>

      <div className="flex gap-2 mb-4">
        <button
          className="px-3 py-1 bg-gray-100 rounded"
          onClick={() => setExpanded(new Set(items.map((i) => i.id)))}
        >
          Expand All
        </button>
        <button
          className="px-3 py-1 bg-gray-100 rounded"
          onClick={() => setExpanded(new Set())}
        >
          Collapse All
        </button>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Type/Ref Code</th>
            <th className="px-4 py-2 text-left">Name/Description</th>
            <th className="px-4 py-2 text-left">Sort Order</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isExpanded = expanded.has(item.id);
            const type = item.subtheme_id
              ? "Subtheme"
              : item.theme_id
              ? "Theme"
              : "Pillar";

            return (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">
                  <button
                    className="inline-flex items-center"
                    onClick={() => toggleExpand(item.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-1" />
                    )}
                    {type[0]}
                    {item.sort_order}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium">
                    {item.subtheme_name ||
                      item.theme_name ||
                      item.pillar_name ||
                      "Untitled"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.subtheme_description ||
                      item.theme_description ||
                      item.pillar_description ||
                      ""}
                  </div>
                </td>
                <td className="px-4 py-2">{item.sort_order}</td>
                <td className="px-4 py-2">
                  {editMode && (
                    <div className="flex gap-2">
                      <button className="text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="text-red-600">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
