// components/framework/FrameworkEditor.tsx
"use client";

import React, { useState } from "react";
import { NormalizedFramework } from "@/lib/types/framework";

type FrameworkEditorProps = {
  tree: NormalizedFramework[];
  versionId: string;
  onChanged: () => Promise<void>;
};

type RowProps = {
  item: NormalizedFramework | any;
  level: number;
  editMode: boolean;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
};

// Small inline icons (so we don’t need heroicons)
const CaretRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const CaretDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const Pencil = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
  </svg>
);
const Trash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-6 4h8" />
  </svg>
);
const Plus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Row: React.FC<RowProps> = ({ item, level, editMode, expanded, toggleExpand }) => {
  const hasChildren =
    (item.themes && item.themes.length > 0) ||
    (item.subthemes && item.subthemes.length > 0);

  const padding = level * 24; // subtle indent

  return (
    <tr className="border-b">
      <td className="py-2 pl-2">
        <div className="flex items-center" style={{ paddingLeft: `${padding}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(item.id)} className="mr-1 text-gray-500 hover:text-gray-700">
              {expanded[item.id] ? <CaretDown /> : <CaretRight />}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              item.type === "pillar"
                ? "bg-blue-100 text-blue-800"
                : item.type === "theme"
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </span>
          <span className="ml-2 text-gray-500 text-xs">{item.ref_code}</span>
        </div>
      </td>
      <td className="py-2">
        <div className="font-medium">{item.name}</div>
        {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
      </td>
      <td className="py-2 text-center">{item.sort_order}</td>
      <td className="py-2 text-right pr-4">
        {editMode && (
          <div className="flex gap-2 justify-end">
            <button className="text-gray-500 hover:text-gray-700"><Pencil /></button>
            <button className="text-gray-500 hover:text-gray-700"><Trash /></button>
            <button className="text-gray-500 hover:text-gray-700"><Plus /></button>
          </div>
        )}
      </td>
    </tr>
  );
};

const FrameworkEditor: React.FC<FrameworkEditorProps> = ({ tree, versionId, onChanged }) => {
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tree.forEach((p) => {
      all[p.id] = true;
      p.themes?.forEach((t) => {
        all[t.id] = true;
        t.subthemes?.forEach((s) => {
          all[s.id] = true;
        });
      });
    });
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const renderRows = (items: any[], level: number): React.ReactNode =>
    items.map((item) => (
      <React.Fragment key={item.id}>
        <Row item={item} level={level} editMode={editMode} expanded={expanded} toggleExpand={toggleExpand} />
        {expanded[item.id] && item.themes && renderRows(item.themes, level + 1)}
        {expanded[item.id] && item.subthemes && renderRows(item.subthemes, level + 1)}
      </React.Fragment>
    ));

  return (
    <div className="border rounded-lg shadow-sm mt-4">
      <div className="flex justify-between items-center p-2 border-b bg-gray-50">
        <div className="flex gap-4 text-sm text-blue-600">
          <button onClick={collapseAll}>Collapse all</button>
          <button onClick={expandAll}>Expand all</button>
        </div>
        <div className="text-sm">
          {editMode ? (
            <button onClick={() => setEditMode(false)} className="text-gray-500 hover:text-gray-700">
              Exit edit mode
            </button>
          ) : (
            <button onClick={() => setEditMode(true)} className="text-gray-500 hover:text-gray-700">
              Enter edit mode
            </button>
          )}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="py-2 pl-2">Type / Ref Code</th>
            <th className="py-2">Name / Description</th>
            <th className="py-2 text-center">Sort Order</th>
            <th className="py-2 text-right pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree, 0)}</tbody>
      </table>
      {editMode && (
        <div className="p-2 border-t bg-gray-50 text-right">
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            + Add Pillar
          </button>
        </div>
      )}
    </div>
  );
};

export default FrameworkEditor;
