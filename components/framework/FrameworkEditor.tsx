"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Copy, CheckCircle, AlertCircle } from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = { versionId: string };

export default function FrameworkEditor({ versionId }: Props) {
  const [data, setData] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/framework/versions/${versionId}/items`);
        const json = await res.json();
        setData(json.data ?? []);
      } catch (e) {
        console.error("Failed to load framework items", e);
      }
    }
    load();
  }, [versionId]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll() {
    const map: Record<string, boolean> = {};
    data.forEach((p) => {
      map[p.id] = true;
      p.themes.forEach((t) => (map[t.id] = true));
    });
    setExpanded(map);
  }

  function collapseAll() {
    setExpanded({});
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={expandAll}>
          Expand All
        </Button>
        <Button size="sm" variant="outline" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {data.map((pillar) => (
        <div key={pillar.id} className="border rounded-lg bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <button onClick={() => toggle(pillar.id)} aria-label="Toggle pillar">
              {expanded[pillar.id] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="font-semibold">{pillar.name}</div>
            {pillar.description && (
              <div className="text-sm text-gray-600 ml-2">{pillar.description}</div>
            )}
            {pillar.color && (
              <span
                className="ml-2 w-4 h-4 rounded-full border"
                style={{ backgroundColor: pillar.color }}
              />
            )}
          </div>

          {expanded[pillar.id] && (
            <div className="p-4">
              {pillar.themes.map((theme) => (
                <div key={theme.id} className="mb-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{theme.name}</div>
                    {theme.color && (
                      <span
                        className="ml-1 w-3 h-3 rounded-full border"
                        style={{ backgroundColor: theme.color }}
                      />
                    )}
                  </div>
                  {theme.description && (
                    <div className="text-sm text-gray-600">{theme.description}</div>
                  )}
                  <ul className="mt-2 list-disc pl-5">
                    {theme.subthemes.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.description && (
                          <span className="text-gray-600 ml-2 text-sm">{s.description}</span>
                        )}
                        {s.color && (
                          <span
                            className="ml-1 w-3 h-3 rounded-full border"
                            style={{ backgroundColor: s.color }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-sm text-gray-600">No items found for this version.</div>
      )}
    </div>
  );
}
