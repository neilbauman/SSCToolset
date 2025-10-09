"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

type AdminUnit = {
  place_uid: string;
  name: string;
  pcode: string;
  level: string | number;
  parent_uid?: string | null;
  parent_pcode?: string | null;
};

type TreeNode = AdminUnit & { children: TreeNode[] };

interface Props {
  units: AdminUnit[];
  activeLevels: number[];
}

export default function AdminUnitsTree({ units, activeLevels }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // --- Build hierarchy ---
  const roots = useMemo(() => {
    if (!units?.length) return [];

    // Create lookup map using both UID and PCode
    const map = new Map<string, TreeNode>();
    units.forEach((u) => {
      const key = u.place_uid || u.pcode;
      map.set(key, { ...u, children: [] });
    });

    const roots: TreeNode[] = [];

    // Link children
    for (const node of map.values()) {
      const parentKey = node.parent_uid || node.parent_pcode || null;
      if (parentKey && map.has(parentKey)) {
        map.get(parentKey)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort nodes alphabetically by PCode
    const sortNodes = (arr: TreeNode[]) => {
      arr.sort((a, b) => (a.pcode ?? "").localeCompare(b.pcode ?? ""));
      arr.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, [units]);

  // --- Expand toggle ---
  const toggleExpand = useCallback((uid: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });
  }, []);

  // --- Render node recursively ---
  const renderNode = (n: TreeNode, depth = 0): JSX.Element | null => {
    const numericLevel = Number(String(n.level).replace("ADM", ""));
    if (!activeLevels.includes(numericLevel)) return null;

    const visibleChildren = n.children.filter((c) => {
      const childLevel = Number(String(c.level).replace("ADM", ""));
      return activeLevels.includes(childLevel);
    });
    const hasChildren = visibleChildren.length > 0;

    return (
      <div key={n.place_uid || n.pcode} style={{ marginLeft: depth * 16 }} className="py-0.5">
        <div
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
          onClick={() => hasChildren && toggleExpand(n.place_uid || n.pcode)}
        >
          {hasChildren ? (
            expanded.has(n.place_uid || n.pcode) ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
          <div className="flex flex-col">
            <span className="font-medium text-sm flex items-center gap-1">
              {n.name}
              {hasChildren && (
                <span className="text-gray-400 text-[11px] bg-gray-100 px-1.5 py-[1px] rounded">
                  {visibleChildren.length}
                </span>
              )}
            </span>
            {n.pcode && <span className="text-gray-500 text-xs">{n.pcode}</span>}
          </div>
        </div>
        {expanded.has(n.place_uid || n.pcode) &&
          visibleChildren.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-3">Administrative Hierarchy</h2>
      {roots.length > 0 ? (
        roots.map((r) => renderNode(r))
      ) : (
        <p className="text-gray-500 text-sm italic">No data to display.</p>
      )}
    </div>
  );
}
