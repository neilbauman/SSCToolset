"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit, Plus, Copy, CheckCircle, Eye } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              const all: Record<string, boolean> = {};
              tree.forEach((p) => {
                all[p.id] = true;
                p.themes.forEach((t) => {
                  all[t.id] = true;
                  t.subthemes.forEach((s) => (all[s.id] = true));
                });
              });
              setExpanded(all);
            }}
            className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded({})}
            className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100 flex items-center gap-1">
            <Eye size={14} /> Open Version
          </button>
          <button className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100 flex items-center gap-1">
            <Copy size={14} /> Clone
          </button>
          <button className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100 flex items-center gap-1">
            <CheckCircle size={14} /> Publish
          </button>
          {editMode && (
            <button className="px-3 py-1 border rounded text-sm bg-green-50 hover:bg-green-100 flex items-center gap-1">
              <Plus size={14} /> Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode((e) => !e)}
            className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100 flex items-center gap-1"
          >
            <Edit size={14} />
            {editMode ? "Exit Edit Mode" : "Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <th className="px-4 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-4 py-2 w-[55%]">Name / Description</th>
            <th className="px-4 py-2 w-[10%] text-right">Sort Order</th>
            <th className="px-4 py-2 w-[15%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar) => (
            <FrameworkRow
              key={pillar.id}
              item={pillar}
              expanded={expanded}
              toggle={toggle}
              editMode={editMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RowProps = {
  item: any;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  editMode: boolean;
  depth?: number;
};

function FrameworkRow({ item, expanded, toggle, editMode, depth = 0 }: RowProps) {
  const hasChildren = item.themes || item.subthemes;
  const isExpanded = expanded[item.id];

  return (
    <>
      <tr className="border-b">
        {/* Type / Ref Code */}
        <td className="px-4 py-2 w-[20%]">
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button onClick={() => toggle(item.id)} className="text-gray-600">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-4 inline-block" />
            )}
            <span className="font-medium text-gray-700">
              {depth === 0 ? "Pillar" : depth === 1 ? "Theme" : "Subtheme"}
            </span>
          </div>
        </td>

        {/* Name / Description */}
        <td className="px-4 py-2 w-[55%]">
          <div>
            <div className="font-semibold">{item.name}</div>
            {item.description && (
              <div className="text-sm text-gray-600">{item.description}</div>
            )}
          </div>
        </td>

        {/* Sort Order */}
        <td className="px-4 py-2 w-[10%] text-right">{item.sort_order ?? "-"}</td>

        {/* Actions */}
        <td className="px-4 py-2 w-[15%] text-right">
          {editMode ? (
            <div className="flex justify-end gap-2">
              <button className="text-blue-600 hover:text-blue-800">
                <Edit size={14} />
              </button>
              <button className="text-green-600 hover:text-green-800">
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <div className="h-4" /> // keeps column stable
          )}
        </td>
      </tr>

      {/* Children */}
      {isExpanded &&
        (item.themes || item.subthemes)?.map((child: any) => (
          <FrameworkRow
            key={child.id}
            item={child}
            expanded={expanded}
            toggle={toggle}
            editMode={editMode}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
