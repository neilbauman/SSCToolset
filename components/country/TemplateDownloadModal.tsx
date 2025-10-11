"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Download } from "lucide-react";
import Papa from "papaparse";

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
  const [datasetType, setDatasetType] = useState<"gradient" | "categorical">(
    "gradient"
  );
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [prefill, setPrefill] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleDownload = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      let csvRows: { pcode: string; value: string; name?: string }[] = [];

      if (prefill) {
        // 1️⃣ Find active admin dataset version
        const { data: activeVersion, error: versionError } = await supabase
          .from("admin_dataset_versions")
          .select("id")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .single();

        if (versionError || !activeVersion) {
          setErrorMsg(
            "No active administrative dataset found — cannot prefill template."
          );
          setLoading(false);
          return;
        }

        // 2️⃣ Fetch admin units for that version and level
        const { data: units, error: unitError } = await supabase
          .from("admin_units")
          .select("pcode, name, level")
          .eq("country_iso", countryIso)
          .eq("dataset_version_id", activeVersion.id)
          .eq("level", adminLevel);

        if (unitError || !units || units.length === 0) {
          setErrorMsg("No admin units found for that level.");
          setLoading(false);
          return;
        }

        // 3️⃣ Construct CSV with prefill
        csvRows = units.map((u: any) => ({
          pcode: u.pcode,
          value: "",
          name: u.name || "",
        }));
      } else {
        // Empty headers only
        csvRows = [{ pcode: "", value: "", name: "" }];
      }

      // 4️⃣ Generate CSV
      const csv = Papa.unparse(csvRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const filename = `${countryIso}_${datasetType}_${adminLevel}_template.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLoading(false);
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to generate template.");
      setLoading(false);
    }
  };

  const adminLevels = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Download Dataset Template
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dataset Type
            </label>
            <select
              value={datasetType}
              onChange={(e) =>
                setDatasetType(e.target.value as "gradient" | "categorical")
              }
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="gradient">Gradient (e.g. Poverty Rate)</option>
              <option value="categorical">Categorical (e.g. Building Types)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Administrative Level
            </label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              {adminLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefill}
              onChange={(e) => setPrefill(e.target.checked)}
            />
            Prefill with PCodes and Names
          </label>
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-sm text-red-600 mt-3 border border-red-200 bg-red-50 p-2 rounded">
            {errorMsg}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
          >
            {loading ? "Generating..." : "Download Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
