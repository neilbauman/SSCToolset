"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";

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

  function PillarRow({ pillar }: { pillar: NormalizedFramework }) {
    const open = !!expanded[pillar.id];
    return (
      <div className="border rounded-lg mb-3 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <button onClick={() => toggle(pillar.id)} aria-label="Toggle pillar">
            {open ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="font-semibold">{pillar.name}</div>
          {pillar.description && (
            <div className="text-sm text-gray-600 ml-2">{pillar.description}</div>
          )}
        </div>
        {open && (
          <div className="p-4">
            {pillar.themes.map((theme) => (
              <div key={theme.id} className="mb-4">
                <div className="font-medium">{theme.name}</div>
                {theme.description && (
                  <div className="text-sm text-gray-600">{theme.description}</div>
                )}
                <ul className="mt-2 list-disc pl-5">
                  {theme.subthemes.map((s) => (
                    <li key={s.id}>
                      <span className="font-normal">{s.name}</span>
                      {s.description && (
                        <span className="text-gray-600 ml-2 text-sm">
                          {s.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {data.map((p) => (
        <PillarRow key={p.id} pillar={p} />
      ))}
      {data.length === 0 && (
        <div className="text-sm text-gray-600">
          No items found for this version.
        </div>
      )}
    </div>
  );
}
