"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = { versionId: string };

export default function FrameworkEditor({ versionId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/framework/versions/${versionId}/tree`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as NormalizedFramework[];
        if (!cancelled) setTree(data);
      } catch (err: any) {
        console.error("Failed to load framework tree", err);
        if (!cancelled) setError("Failed to load framework tree.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="text-sm text-gray-600">Loading framework…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!tree || tree.length === 0) return <div className="text-sm text-gray-600">No framework items found.</div>;

  return (
    <div className="space-y-4">
      {tree.map((pillar) => (
        <div key={pillar.id} className="border-b pb-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(pillar.id)}>
            {expanded[pillar.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-semibold text-lg">{pillar.name}</span>
            {pillar.description && <span className="text-sm text-gray-500">– {pillar.description}</span>}
          </div>

          {expanded[pillar.id] && (
            <div className="ml-6 mt-2 space-y-2">
              {pillar.themes.map((theme) => (
                <div key={theme.id}>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(theme.id)}>
                    {expanded[theme.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">{theme.name}</span>
                    {theme.description && <span className="text-sm text-gray-500">– {theme.description}</span>}
                  </div>

                  {expanded[theme.id] && theme.subthemes.length > 0 && (
                    <ul className="ml-6 list-disc text-sm text-gray-700">
                      {theme.subthemes.map((s) => (
                        <li key={s.id}>
                          {s.name}
                          {s.description && <span className="text-xs text-gray-500"> — {s.description}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
