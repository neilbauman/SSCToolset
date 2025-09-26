"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ChevronDown, ChevronRight } from "lucide-react";

type FrameworkItem = {
  id: string;
  version_id: string;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  pillar?: { name: string; description: string } | null;
  theme?: { name: string; description: string } | null;
  subtheme?: { name: string; description: string } | null;
};

type Props = {
  versionId: string;
};

function generateRefCode(item: FrameworkItem): string {
  if (item.subtheme_id) return `ST${item.sort_order}`;
  if (item.theme_id) return `T${item.sort_order}`;
  if (item.pillar_id) return `P${item.sort_order}`;
  return "—";
}

export default function FrameworkEditor({ versionId }: Props) {
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabaseBrowser
        .from("framework_version_items")
        .select(
          `
          id,
          version_id,
          sort_order,
          pillar_id,
          theme_id,
          subtheme_id,
          pillar:pillar_id (
            name,
            description
          ),
          theme:theme_id (
            name,
            description
          ),
          subtheme:subtheme_id (
            name,
            description
          )
        `
        )
        .eq("version_id", versionId)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setItems(data as FrameworkItem[]);
      }
    };
    load();
  }, [versionId]);

  return (
    <div className="mt-4 border rounded p-4 bg-white">
      <div className="flex justify-between mb-2">
        <div>
          <button className="mr-2">Expand All</button>
          <button>Collapse All</button>
        </div>
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Type/Ref Code</th>
            <th className="p-2">Name/Description</th>
            <th className="p-2">Sort Order</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isExpanded = expanded[item.id] || false;
            return (
              <tr key={item.id} className="border-t">
                <td className="p-2 flex items-center">
                  {item.theme_id || item.subtheme_id ? (
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="mr-2"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  ) : (
                    <span className="mr-6" />
                  )}
                  {generateRefCode(item)}
                </td>
                <td className="p-2">
                  {item.pillar?.name ||
                    item.theme?.name ||
                    item.subtheme?.name ||
                    "Untitled"}
                  <div className="text-gray-500 text-xs">
                    {item.pillar?.description ||
                      item.theme?.description ||
                      item.subtheme?.description ||
                      ""}
                  </div>
                </td>
                <td className="p-2">{item.sort_order}</td>
                <td className="p-2">—</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
