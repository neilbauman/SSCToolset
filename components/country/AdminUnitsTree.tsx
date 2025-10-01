"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface AdminUnit {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string | null;
}

interface TreeNode extends AdminUnit {
  children?: TreeNode[];
}

function TreeItem({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div
        className="flex items-center cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 mr-1" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 mr-1" />
          )
        ) : (
          <span className="w-4 h-4 mr-1" />
        )}
        <span className="font-medium">{node.name}</span>
        <span className="ml-2 text-xs text-gray-500">{node.pcode}</span>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <TreeItem key={child.id} node={child} />
        ))}
    </div>
  );
}

export default function AdminUnitsTree({ units }: { units: AdminUnit[] }) {
  // Build hierarchy
  const unitMap: Record<string, TreeNode> = {};
  units.forEach((u) => {
    unitMap[u.pcode] = { ...u, children: [] };
  });

  const roots: TreeNode[] = [];
  units.forEach((u) => {
    if (u.parent_pcode && unitMap[u.parent_pcode]) {
      unitMap[u.parent_pcode].children?.push(unitMap[u.pcode]);
    } else {
      roots.push(unitMap[u.pcode]);
    }
  });

  return (
    <div className="border rounded-lg p-4 shadow-sm mt-6">
      <h2 className="text-lg font-semibold mb-3">Hierarchy View</h2>
      {roots.length > 0 ? (
        roots.map((node) => <TreeItem key={node.id} node={node} />)
      ) : (
        <p className="text-gray-500 text-sm">No data to display.</p>
      )}
    </div>
  );
}
