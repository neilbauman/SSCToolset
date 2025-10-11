"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Info } from "lucide-react";

interface TemplateDownloadModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}

export default function TemplateDownloadModal({
  open,
  onClose,
  countryIso,
}: TemplateDownloadModalProps) {
  const [templateType, setTemplateType] = useState<"gradient" | "categorical">(
    "gradient"
  );
  const [prefill, setPrefill] = useState(false);
  const [adminLevels, setAdminLevels] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number>(3);

  // Load available admin levels from the active dataset
  useEffect(() => {
    if (open && prefill) loadAdminLevels();
  }, [open, prefill]);

  async function loadAdminLevels() {
    const { data: activeVersion } = await supabase
      .from("admin_dataset_versions")
      .select("id")
      .eq("country_iso", countryIso)
      .eq("is_active", true)
      .maybeSingle();

    if (!activeVersion?.id) return;

    const { data: levels } = await supabase
      .from("admin_units")
      .select("level")
      .eq("dataset_version_id", activeVersion.id);

    if (levels) {
      const uniqueLevels = Array.from(
        new Set(
          levels
            .map((l) => parseInt((l.level || "").replace("ADM", ""), 10))
            .filter((n) => !isNaN(n))
        )
      ).sort((a, b) => a - b);
      setAdminLevels(uniqueLevels);
    }
  }

  async function handleDownload() {
    let headers: string[] = [];
    let rows: any[] = [];

    if (templateType === "gradient") {
      headers = ["name(optional)", "pcode", "value"];
    } else {
      headers = ["name(optional)", "pcode"];
      for (let i = 1; i <= categoryCount; i++) headers.push(`category_${i}`);
    }

    // Prefill rows if requested
    if (prefill && selectedLevel !== null) {
      const { data: activeVersion } = await supabase
        .from("admin_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .maybeSingle();

      if (activeVersion?.id) {
        const { data: units } = await supabase
          .from("admin_units")
          .select("pcode, name, level")
          .eq("dataset_version_id", activeVersion.id)
          .eq("level", `ADM${selectedLevel}`);

        if (units) {
          rows = units.map((u) => {
            const base =
              templateType === "gradient"
                ? [u.name ?? "", u.pcode, ""]
                : [u.name ?? "", u.pcode];
            if (templateType === "categorical") {
              for (let i = 0; i < categoryCount; i++) base.push("");
            }
            return base;
          });
        }
      }
    }

    // Build CSV
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateType.toUpperCase()}_TEMPLATE.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Download Dataset Template
        </h2>

        <div className="space-y-4">
          {/* Template type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Template Type
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="gradient">Gradient (e.g. poverty per admin)</option>
              <option value="categorical">
                Categorical (e.g. housing types)
              </option>
            </select>
          </div>

          {/* Category count */}
          {templateType === "categorical" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Number of Categories
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={categoryCount}
                onChange={(e) => setCategoryCount(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Prefill toggle */}
          <div className="flex items-center gap-2">
            <input
              id="prefill"
              type="checkbox"
              checked={prefill}
              onChange={(e) => setPrefill(e.target.checked)}
              className="w-4 h-4 accent-[var(--gsc-red)]"
            />
            <label htmlFor="prefill" className="text-sm flex items-center gap-1">
              Prefill with admin boundaries
              <div className="relative group">
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                <div className="absolute left-5 -top-1 hidden group-hover:block bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-md w-56">
                  Prefill uses the currently active administrative boundary
                  dataset for this country.
                </div>
              </div>
            </label>
          </div>

          {/* Admin level selector */}
          {prefill && adminLevels.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Administrative Level
              </label>
              <select
                value={selectedLevel ?? ""}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Level</option>
                {adminLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    ADM{lvl}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
