"use client";

import React, { useEffect, useState } from "react";
import {
  getFrameworkTree,
  replaceFrameworkVersionItems,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
  editable: boolean;
};

export default function FrameworkEditor({ versionId, editable }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, [versionId]);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFrameworkTree(versionId);
      if (Array.isArray(data)) {
        setTree(data);
      } else {
        setTree([]);
      }
    } catch (err: any) {
      console.error("Error loading framework tree:", err.message);
      setError("Failed to load framework tree");
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await replaceFrameworkVersionItems(versionId, tree);
      await loadTree();
    } catch (err: any) {
      console.error("Error saving framework:", err.message);
      alert("Failed to save changes");
    }
  };

  if (loading) {
    return <div>Loading framework items…</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="border rounded p-4 text-sm text-gray-500">
        No items in this framework version yet.
        {editable && (
          <span> Use the toolbar above to add your first pillar.</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {editable && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={loadTree}
            className="px-3 py-1 rounded bg-gray-200 text-sm hover:bg-gray-300"
          >
            Discard
          </button>
        </div>
      )}

      {/* Hierarchical Table */}
      <table className="w-full border text-sm table-fixed">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 w-[20%] text-left">Type / Ref Code</th>
            <th className="px-2 py-1 w-[50%] text-left">Name / Description</th>
            <th className="px-2 py-1 w-[15%] text-left">Sort Order</th>
            <th className="px-2 py-1 w-[15%] text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar) => (
            <React.Fragment key={pillar.id}>
              <tr className="border-t">
                <td className="px-2 py-1 font-medium">
                  {pillar.ref_code ?? `P?`}
                </td>
                <td className="px-2 py-1">
                  {pillar.name}
                  {pillar.description && (
                    <div className="text-xs text-gray-500">
                      {pillar.description}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1">
                  {pillar.sort_order ?? "-"}
                </td>
                <td className="px-2 py-1">
                  {editable ? (
                    <div className="flex gap-2 text-sm">
                      <button className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline">
                        Delete
                      </button>
                      <button className="text-green-600 hover:underline">
                        Add Theme
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
              {/* Themes */}
              {(pillar.themes ?? []).map((theme) => (
                <React.Fragment key={theme.id}>
                  <tr className="border-t">
                    <td className="pl-6 py-1">{theme.ref_code ?? `T?`}</td>
                    <td className="px-2 py-1">
                      {theme.name}
                      {theme.description && (
                        <div className="text-xs text-gray-500">
                          {theme.description}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1">{theme.sort_order ?? "-"}</td>
                    <td className="px-2 py-1">
                      {editable ? (
                        <div className="flex gap-2 text-sm">
                          <button className="text-blue-600 hover:underline">
                            Edit
                          </button>
                          <button className="text-red-600 hover:underline">
                            Delete
                          </button>
                          <button className="text-green-600 hover:underline">
                            Add Subtheme
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                  {/* Subthemes */}
                  {(theme.subthemes ?? []).map((sub) => (
                    <tr key={sub.id} className="border-t">
                      <td className="pl-12 py-1">{sub.ref_code ?? `ST?`}</td>
                      <td className="px-2 py-1">
                        {sub.name}
                        {sub.description && (
                          <div className="text-xs text-gray-500">
                            {sub.description}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {sub.sort_order ?? "-"}
                      </td>
                      <td className="px-2 py-1">
                        {editable ? (
                          <div className="flex gap-2 text-sm">
                            <button className="text-blue-600 hover:underline">
                              Edit
                            </button>
                            <button className="text-red-600 hover:underline">
                              Delete
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
