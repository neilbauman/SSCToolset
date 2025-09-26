"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/services/supabaseBrowser";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash,
} from "lucide-react";

type FrameworkEditorProps = {
  version: { id: string; name: string };
};

type FrameworkRow = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  pillar_name: string | null;
  pillar_description: string | null;
  theme_id: string | null;
  theme_name: string | null;
  theme_description: string | null;
  subtheme_id: string | null;
  subtheme_name: string | null;
  subtheme_description: string | null;
};

export default function FrameworkEditor({ version }: FrameworkEditorProps) {
  const [items, setItems] = useState<FrameworkRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabaseBrowser.rpc(
        "get_framework_structure",
        { version_id: version.id }
      );
      if (error) {
        console.error("Error loading structure:", error);
      } else {
        setItems(data as FrameworkRow[]);
      }
    };
    load();
  }, [version.id]);

  // group by pillar → theme → subtheme
  const grouped = items.reduce((acc, row) => {
    if (!row.pillar_id) return acc;
    if (!acc[row.pillar_id]) {
      acc[row.pillar_id] = {
        ...row,
        themes: {},
      };
    }
    if (row.theme_id) {
      if (!acc[row.pillar_id].themes[row.theme_id]) {
        acc[row.pillar_id].themes[row.theme_id] = {
          ...row,
          subthemes: [],
        };
      }
      if (row.subtheme_id) {
        acc[row.pillar_id].themes[row.theme_id].subthemes.push(row);
      }
    }
    return acc;
  }, {} as Record<string, any>);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const renderPillar = (pillar: any) => {
    const isOpen = expanded.has(pillar.pillar_id);
    return (
      <>
        <tr>
          <td className="px-4 py-2 font-medium text-blue-900">
            <button onClick={() => toggleExpand(pillar.pillar_id)}>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>{" "}
            P{pillar.sort_order}
          </td>
          <td className="px-4 py-2">
            <div>{pillar.pillar_name}</div>
            <div className="text-sm text-gray-500">{pillar.pillar_description}</div>
          </td>
          <td className="px-4 py-2">{pillar.sort_order}</td>
          <td className="px-4 py-2">
            {editMode && (
              <>
                <button className="text-blue-600 mr-2">
                  <Pencil size={14} />
                </button>
                <button className="text-red-600">
                  <Trash size={14} />
                </button>
              </>
            )}
          </td>
        </tr>
        {isOpen &&
          Object.values(pillar.themes).map((theme: any) =>
            renderTheme(pillar.pillar_id, theme)
          )}
      </>
    );
  };

  const renderTheme = (pillarId: string, theme: any) => {
    const isOpen = expanded.has(theme.theme_id);
    return (
      <>
        <tr className="bg-gray-50">
          <td className="pl-8 pr-4 py-2 text-blue-800">
            <button onClick={() => toggleExpand(theme.theme_id)}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>{" "}
            T{theme.sort_order}
          </td>
          <td className="px-4 py-2">
            <div>{theme.theme_name}</div>
            <div className="text-sm text-gray-500">{theme.theme_description}</div>
          </td>
          <td className="px-4 py-2">{theme.sort_order}</td>
          <td className="px-4 py-2">
            {editMode && (
              <>
                <button className="text-blue-600 mr-2">
                  <Pencil size={14} />
                </button>
                <button className="text-red-600">
                  <Trash size={14} />
                </button>
              </>
            )}
          </td>
        </tr>
        {isOpen &&
          theme.subthemes.map((sub: FrameworkRow) => (
            <tr key={sub.subtheme_id} className="bg-gray-100">
              <td className="pl-16 pr-4 py-2 text-blue-700">
                ST{sub.sort_order}
              </td>
              <td className="px-4 py-2">
                <div>{sub.subtheme_name}</div>
                <div className="text-sm text-gray-500">{sub.subtheme_description}</div>
              </td>
              <td className="px-4 py-2">{sub.sort_order}</td>
              <td className="px-4 py-2">
                {editMode && (
                  <>
                    <button className="text-blue-600 mr-2">
                      <Pencil size={14} />
                    </button>
                    <button className="text-red-600">
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
      </>
    );
  };

  return (
    <div className="mt-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="font-semibold text-red-900">
          Version Structure: {version.name}
        </h3>
        <div className="space-x-2">
          <button
            onClick={() => setExpanded(new Set(items.map((i) => i.id)))}
            className="px-3 py-1 text-sm border rounded"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            className="px-3 py-1 text-sm border rounded"
          >
            Collapse All
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-3 py-1 text-sm border rounded bg-blue-600 text-white"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700 text-left">
          <tr>
            <th className="px-4 py-2">Type/Ref Code</th>
            <th className="px-4 py-2">Name/Description</th>
            <th className="px-4 py-2">Sort Order</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(grouped).map((pillar: any) =>
            renderPillar(pillar)
          )}
        </tbody>
      </table>
    </div>
  );
}
