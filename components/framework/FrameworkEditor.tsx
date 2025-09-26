"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ChevronDown, ChevronRight, Pencil, Trash } from "lucide-react";

interface FrameworkItem {
  id: string;
  version_id: string;
  sort_order: number;
  ref_code: string;
  type: "pillar" | "theme" | "subtheme";
  name: string;
  description: string;
}

interface FrameworkEditorProps {
  version: string;
}

export default function FrameworkEditor({ version }: FrameworkEditorProps) {
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/framework/versions/${version}/items`);
      const { data } = await res.json();
      setItems(data);
    }
    load();
  }, [version]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-4 border rounded-md p-4">
      <h2 className="text-lg font-semibold text-red-800 mb-2">
        Version Structure
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Type/Ref Code</th>
            <th className="p-2">Name/Description</th>
            <th className="p-2">Sort Order</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2 flex items-center">
                <button onClick={() => toggleExpand(item.id)}>
                  {expanded.has(item.id) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <span className="ml-1">{item.ref_code}</span>
              </td>
              <td className="p-2">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-500">{item.description}</div>
              </td>
              <td className="p-2">{item.sort_order}</td>
              <td className="p-2 flex space-x-2">
                <button className="text-blue-600 hover:underline">
                  <Pencil size={14} />
                </button>
                <button className="text-red-600 hover:underline">
                  <Trash size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
