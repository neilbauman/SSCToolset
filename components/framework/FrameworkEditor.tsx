"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabaseBrowser"; // ✅ fixed relative path
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash,
  Plus,
} from "lucide-react";

type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  pillar_name?: string;
  pillar_description?: string;
  theme_name?: string;
  theme_description?: string;
  subtheme_name?: string;
  subtheme_description?: string;
};

export default function FrameworkEditor({ versionId }: { versionId: string }) {
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadItems() {
      const { data, error } = await supabaseBrowser.rpc(
        "get_framework_version_structure",
        { version_id: versionId }
      );

      if (error) {
        console.error("Error loading structure:", error);
      } else {
        setItems(data as FrameworkItem[]);
      }
    }

    loadItems();
  }, [versionId]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderRows = (level: number) => {
    return items
      .filter((item) => {
        if (level === 0) return item.pillar_id && !item.theme_id && !item.subtheme_id;
        if (level === 1) return item.theme_id && !item.subtheme_id;
        if (level === 2) return item.subtheme_id;
        return false;
      })
      .map((item) => {
        const id = item.id;
        const isExpanded = expanded[id] || false;

        let refCode = "";
        if (item.pillar_id && !item.theme_id && !item.subtheme_id) {
          refCode = `P${item.sort_order}`;
        } else if (item.theme_id && !item.subtheme_id) {
          refCode = `T${item.sort_order}`;
        } else if (item.subtheme_id) {
          refCode = `ST${item.sort_order}`;
        }

        const name =
          item.pillar_name || item.theme_name || item.subtheme_name || "Untitled";
        const description =
          item.pillar_description ||
          item.theme_description ||
          item.subtheme_description ||
          "";

        return (
          <div key={id} className="border-b">
            <div
              className={`flex items-center px-4 py-2`}
              style={{ paddingLeft: `${level * 1.5}rem` }} // ✅ indent per level
            >
              <button onClick={() => toggleExpand(id)} className="mr-2">
                {level < 2 && (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                )}
              </button>
              <div className="w-32 font-mono">{refCode}</div>
              <div className="flex-1">
                <div className="font-medium">{name}</div>
                {description && (
                  <div className="text-xs text-gray-500">{description}</div>
                )}
              </div>
              <div className="w-20 text-center">{item.sort_order}</div>
              <div className="flex space-x-2">
                <button className="text-blue-500 hover:text-blue-700">
                  <Pencil className="w-4 h-4" />
                </button>
                <button className="text-red-500 hover:text-red-700">
                  <Trash className="w-4 h-4" />
                </button>
                <button className="text-green-500 hover:text-green-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isExpanded && <div>{renderRows(level + 1)}</div>}
          </div>
        );
      });
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="font-semibold text-lg text-red-800">
          Version Structure
        </div>
        <div className="space-x-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() =>
              setExpanded(Object.fromEntries(items.map((i) => [i.id, true])))
            }
          >
            Expand All
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setExpanded({})}
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[8rem_1fr_6rem_10rem] font-semibold px-4 py-2 border-b bg-gray-100">
        <div>Type/Ref Code</div>
        <div>Name/Description</div>
        <div>Sort Order</div>
        <div>Actions</div>
      </div>

      <div>{renderRows(0)}</div>
    </div>
  );
}
