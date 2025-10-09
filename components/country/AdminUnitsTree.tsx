"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

type AdminUnit = {
  place_uid: string;
  name: string;
  pcode: string;
  level: number;
  parent_uid?: string | null;
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
    const map = new Map<string, TreeNode>();
    units.forEach((u) => map.set(u.place_uid, { ...u, children: [] }));

    const roots: TreeNode[] = [];
    for (const node of map.values()) {
      if (node.parent_uid && map.has(node.parent_uid))
        map.get(node.parent_uid)!.children.push(node);
      else roots.push(node);
    }

    const sortNodes = (arr: TreeNode[]) => {
      arr.sort((a, b) => (a.pcode ?? "").localeCompare(b.pcode ?? ""));
      arr.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  }, [units]);

  const toggleExpand = useCallback((uid: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });
  }, []);

  const renderNode = (n: TreeNode, depth = 0): JSX.Element | null => {
    if (!activeLevels.includes(n.level)) return null;
    const visibleChildren = n.children.filter((c) =>
      activeLevels.includes(c.level)
    );
    const hasChildren = visibleChildren.length > 0;

    return (
      <div key={n.place_uid} style={{ marginLeft: depth * 16 }} className="py-0.5">
        <div
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
          onClick={() => hasChildren && toggleExpand(n.place_uid)}
        >
          {hasChildren ? (
            expanded.has(n.place_uid) ? (
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
            {n.pcode && (
              <span className="text-gray-500 text-xs">{n.pcode}</span>
            )}
          </div>
        </div>
        {expanded.has(n.place_uid) &&
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
