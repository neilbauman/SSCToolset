"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  description: string | null;
  ref_code: string;
  sort_order: number;
  type: "pillar" | "theme" | "subtheme";
  themes?: Item[];
  subthemes?: Item[];
};

export default function FrameworkEditor({ versionId }: { versionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/framework/tree?version=${versionId}`);
        const { data } = await res.json();
        setItems(data ?? []);
      } catch (err) {
        console.error("Failed to load framework tree", err);
      } finally {
        setLoading(false);
      }
    }
    if (versionId) load();
  }, [versionId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">Primary Framework Editor</h2>
        <button
          className="px-3 py-1 text-sm border rounded"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="w-1/5 text-left py-2">Type / Ref Code</th>
            <th className="w-2/5 text-left py-2">Name / Description</th>
            <th className="w-1/5 text-center py-2">Sort Order</th>
            <th className="w-1/5 text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                No items yet. Use “Add Pillar” to begin.
              </td>
            </tr>
          ) : (
            items.map((pillar) => (
              <Row
                key={pillar.id}
                item={pillar}
                level={0}
                editMode={editMode}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  item,
  level,
  editMode,
}: {
  item: Item;
  level: number;
  editMode: boolean;
}) {
  const padding = level * 20; // indent

  return (
    <>
      <tr className="border-b">
        <td className="py-2 pl-2 align-top">
          <span
            className={`inline-block text-xs px-2 py-1 rounded ${
              item.type === "pillar"
                ? "bg-blue-100 text-blue-700"
                : item.type === "theme"
                ? "bg-green-100 text-green-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </span>
          <span className="ml-2 text-gray-500 text-xs">{item.ref_code}</span>
        </td>
        <td className="py-2" style={{ paddingLeft: `${padding}px` }}>
          <div className="font-medium">{item.name}</div>
          {item.description && (
            <div className="text-gray-500 text-xs">{item.description}</div>
          )}
        </td>
        <td className="py-2 text-center">{item.sort_order}</td>
        <td className="py-2 text-right space-x-2">
          {editMode && (
            <>
              <button className="text-blue-600 hover:underline text-xs">
                ✎
              </button>
              <button className="text-red-600 hover:underline text-xs">
                🗑
              </button>
              <button className="text-gray-600 hover:underline text-xs">
                ＋
              </button>
            </>
          )}
        </td>
      </tr>

      {/* Render children */}
      {item.themes?.map((theme) => (
        <Row
          key={theme.id}
          item={theme}
          level={level + 1}
          editMode={editMode}
        />
      ))}
      {item.subthemes?.map((sub) => (
        <Row
          key={sub.id}
          item={sub}
          level={level + 2}
          editMode={editMode}
        />
      ))}
    </>
  );
}
