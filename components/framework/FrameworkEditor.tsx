"use client";

import React, { useEffect, useState } from "react";
import { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  versionId: string;
  onChanged: () => Promise<void>;
  onAddPillar?: () => void;
};

type Item = NormalizedFramework & {
  type: "pillar" | "theme" | "subtheme";
  themes?: Item[];
  subthemes?: Item[];
  sort_order?: number | null;
};

type RowProps = {
  item: Item;
  level: number;
  editMode: boolean;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  parentIndexes: { pillar?: number; theme?: number };
  indexWithinParent: number;
};

function badgeClasses(type: Item["type"]) {
  switch (type) {
    case "pillar":
      return "bg-blue-100 text-blue-800";
    case "theme":
      return "bg-green-100 text-green-800";
    default:
      return "bg-purple-100 text-purple-800";
  }
}

// Compute UI ref codes: P1, T1.2, ST1.2.3
function makeRefCode(
  type: Item["type"],
  parents: { pillar?: number; theme?: number },
  indexWithinParent: number
) {
  if (type === "pillar") {
    return `P${indexWithinParent + 1}`;
  }
  if (type === "theme") {
    const p = (parents.pillar ?? 0) + 1;
    const t = indexWithinParent + 1;
    return `T${p}.${t}`;
  }
  const p = (parents.pillar ?? 0) + 1;
  const t = (parents.theme ?? 0) + 1;
  const s = indexWithinParent + 1;
  return `ST${p}.${t}.${s}`;
}

const Row: React.FC<RowProps> = ({
  item,
  level,
  editMode,
  expanded,
  toggleExpand,
  parentIndexes,
  indexWithinParent,
}) => {
  const hasChildren =
    (item.themes && item.themes.length > 0) ||
    (item.subthemes && item.subthemes.length > 0);

  const padding = level * 20;
  const refCode = makeRefCode(item.type, parentIndexes, indexWithinParent);

  return (
    <tr className="border-b">
      {/* Type / Ref Code */}
      <td className="py-2 pl-2">
        <div className="flex items-center" style={{ paddingLeft: `${padding}px` }}>
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(item.id)}
              className="mr-1 text-gray-500 hover:text-gray-700"
              aria-label={expanded[item.id] ? "Collapse" : "Expand"}
            >
              {expanded[item.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}

          {/* reorder placeholder (disabled this phase) */}
          <span className="mx-1 text-gray-300">
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-[11px] ${badgeClasses(
              item.type
            )}`}
          >
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </span>

          <span className="ml-2 text-gray-500 text-[11px]">{refCode}</span>
        </div>
      </td>

      {/* Name / Description */}
      <td className="py-2">
        <div className="font-medium">{item.name}</div>
        {item.description && (
          <div className="text-xs text-gray-500">{item.description}</div>
        )}
      </td>

      {/* Sort Order: simple 1-based visual index per parent */}
      <td
        className="py-2 text-center"
        title={
          item.sort_order != null
            ? `Stored sort_order: ${item.sort_order}`
            : undefined
        }
      >
        {indexWithinParent + 1}
      </td>

      {/* Actions column always present; icons only when edit mode */}
      <td className="py-2 pr-3">
        <div className="flex items-center justify-end gap-2">
          {editMode ? (
            <>
              <button className="text-gray-500 hover:text-gray-700" title="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button className="text-gray-500 hover:text-gray-700" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
              <button className="text-gray-500 hover:text-gray-700" title="Add">
                <Plus className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="inline-block h-4 w-16" />
          )}
        </div>
      </td>
    </tr>
  );
};

const FrameworkEditor: React.FC<Props> = ({
  tree,
  versionId,
  onChanged,
  onAddPillar,
}) => {
  // default collapsed as requested
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    setExpanded({}); // reset to collapsed whenever version changes
  }, [versionId]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tree.forEach((p) => {
      all[p.id] = true;
      p.themes?.forEach((t) => {
        all[t.id] = true;
        t.subthemes?.forEach((s) => (all[s.id] = true));
      });
    });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar row above the table */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-4 text-sm">
          <button className="text-blue-600 hover:underline" onClick={collapseAll}>
            Collapse all
          </button>
          <button className="text-blue-600 hover:underline" onClick={expandAll}>
            Expand all
          </button>
          {editMode && (
            <button
              onClick={onAddPillar}
              className="ml-2 inline-flex items-center gap-1 rounded bg-blue-600 text-white px-2.5 py-1 text-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Pillar
            </button>
          )}
        </div>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      {/* Tree table */}
      <table className="w-full text-sm">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "52%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="py-2 pl-2">Type / Ref Code</th>
            <th className="py-2">Name / Description</th>
            <th className="py-2 text-center">Sort Order</th>
            <th className="py-2 text-right pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, pi) => (
            <React.Fragment key={pillar.id}>
              <Row
                item={{ ...pillar, type: "pillar" }}
                level={0}
                editMode={editMode}
                expanded={expanded}
                toggleExpand={toggleExpand}
                parentIndexes={{}}
                indexWithinParent={pi}
              />
              {expanded[pillar.id] &&
                (pillar.themes ?? []).map((theme, ti) => (
                  <React.Fragment key={theme.id}>
                    <Row
                      item={{ ...theme, type: "theme" }}
                      level={1}
                      editMode={editMode}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      parentIndexes={{ pillar: pi }}
                      indexWithinParent={ti}
                    />
                    {expanded[theme.id] &&
                      (theme.subthemes ?? []).map((sub, si) => (
                        <Row
                          key={sub.id}
                          item={{ ...sub, type: "subtheme" }}
                          level={2}
                          editMode={editMode}
                          expanded={expanded}
                          toggleExpand={toggleExpand}
                          parentIndexes={{ pillar: pi, theme: ti }}
                          indexWithinParent={si}
                        />
                      ))}
                  </React.Fragment>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FrameworkEditor;
