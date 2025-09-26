"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash,
} from "lucide-react";

type FrameworkEditorProps = {
  versionId: string;
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

export default function FrameworkEditor({ versionId }: FrameworkEditorProps) {
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const loadStructure = async () => {
      const { data, error } = await supabaseBrowser.rpc("get_framework_structure", {
        version_id: versionId,
      });

      if (error) {
        console.error("Error loading structure:", error);
      } else {
        setItems(data as FrameworkItem[]);
      }
    };

    loadStructure();
  }, [versionId]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const grouped = groupByPillar(items);

  return (
    <div className="rounded border bg-white p-4 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-red-900">
          Version Structure: {versionId}
        </h3>
        <div className="space-x-2">
          <button
            onClick={() => setExpanded(new Set(items.map((i) => i.pillar_id!)))}
            className="rounded border px-2 py-1 text-sm"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            className="rounded border px-2 py-1 text-sm"
          >
            Collapse All
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Type/Ref Code</th>
            <th className="p-2">Name/Description</th>
            <th className="p-2">Sort Order</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(grouped).map((pillar) => (
            <tr key={pillar.id} className="border-b">
              <td className="p-2">
                <button
                  onClick={() => toggleExpand(pillar.id!)}
                  className="flex items-center"
                >
                  {expanded.has(pillar.id!) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  <span className="ml-1 font-semibold">
                    P{pillar.sort_order}
                  </span>
                </button>
              </td>
              <td className="p-2">
                <div className="font-medium">{pillar.name}</div>
                <div className="text-xs text-gray-500">
                  {pillar.description}
                </div>
              </td>
              <td className="p-2">{pillar.sort_order}</td>
              <td className="p-2 space-x-2">
                {editMode && (
                  <>
                    <button className="text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button className="text-red-600">
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupByPillar(items: FrameworkItem[]) {
  const grouped: Record<string, any> = {};
  for (const item of items) {
    if (!item.pillar_id) continue;
    if (!grouped[item.pillar_id]) {
      grouped[item.pillar_id] = {
        id: item.pillar_id,
        name: item.pillar_name,
        description: item.pillar_description,
        sort_order: item.sort_order,
        themes: {},
      };
    }
    if (item.theme_id) {
      if (!grouped[item.pillar_id].themes[item.theme_id]) {
        grouped[item.pillar_id].themes[item.theme_id] = {
          id: item.theme_id,
          name: item.theme_name,
          description: item.theme_description,
          sort_order: item.sort_order,
          subthemes: [],
        };
      }
      if (item.subtheme_id) {
        grouped[item.pillar_id].themes[item.theme_id].subthemes.push({
          id: item.subtheme_id,
          name: item.subtheme_name,
          description: item.subtheme_description,
          sort_order: item.sort_order,
        });
      }
    }
  }
  return grouped;
}
