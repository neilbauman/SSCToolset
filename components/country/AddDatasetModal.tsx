"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Papa from "papaparse";
import { X, Upload, Loader2 } from "lucide-react";

type AddDatasetModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved: () => void;
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  theme: string;
  data_type: string;
  default_admin_level: string;
};

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: AddDatasetModalProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [adminLevel, setAdminLevel] = useState<string>("ADM0");
  const [value, setValue] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ theme: "All", type: "All" });
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadIndicators = async () => {
      const { data, error } = await supabase.from("indicator_catalogue").select("*").order("theme");
      if (!error && data) {
        setIndicators(data);
        setFilteredIndicators(data);
      }
    };
    loadIndicators();
  }, []);

  const handleFilterChange = (theme: string, type: string, searchTerm: string) => {
    const filtered = indicators.filter((ind) => {
      const matchesTheme = theme === "All" || ind.theme === theme;
      const matchesType = type === "All" || ind.type === type;
      const matchesSearch =
        !searchTerm ||
        ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTheme && matchesType && matchesSearch;
    });
    setFilteredIndicators(filtered);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data);
      },
    });
  };

  const handleSave = async () => {
    if (!selectedIndicator || !title) {
      alert("Indicator and title are required.");
      return;
    }
    setLoading(true);

    const { data: datasetMeta, error: metaError } = await supabase
      .from("dataset_metadata")
      .insert({
        country_iso: countryIso,
        indicator_id: selectedIndicator.id,
        title: title.trim(),
        admin_level: adminLevel,
        theme: selectedIndicator.theme,
        source: JSON.stringify({ name: sourceName, url: sourceUrl }),
        upload_type: file ? "csv" : "manual",
      })
      .select()
      .single();

    if (metaError || !datasetMeta) {
      alert("Failed to save dataset metadata.");
      setLoading(false);
      return;
    }

    // Prepare data for dataset_values
    let rows: any[] = [];
    if (file && parsedRows.length) {
      rows = parsedRows.map((r) => ({
        dataset_id: datasetMeta.id,
        admin_pcode: r.pcode || r.PCODE || r.code || null,
        value: r.value ? parseFloat(r.value) : null,
        unit: selectedIndicator.data_type,
        notes: notes || null,
      }));
    } else if (value) {
      rows = [
        {
          dataset_id: datasetMeta.id,
          admin_pcode: "ADM0",
          value: parseFloat(value),
          unit: selectedIndicator.data_type,
          notes: notes || null,
        },
      ];
    }

    if (rows.length) {
      const { error: insertError } = await supabase.from("dataset_values").insert(rows);
      if (insertError) {
        console.error(insertError);
        alert("Failed to insert dataset values.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-red)]">Add Dataset</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Search indicators..."
            className="border rounded px-2 py-1 text-sm flex-1"
            onChange={(e) =>
              handleFilterChange(filters.theme, filters.type, e.target.value)
            }
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            onChange={(e) =>
              setFilters((f) => {
                const newF = { ...f, theme: e.target.value };
                handleFilterChange(newF.theme, newF.type, "");
                return newF;
              })
            }
          >
            <option>All</option>
            {[...new Set(indicators.map((i) => i.theme))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 text-sm"
            onChange={(e) =>
              setFilters((f) => {
                const newF = { ...f, type: e.target.value };
                handleFilterChange(newF.theme, newF.type, "");
                return newF;
              })
            }
          >
            <option>All</option>
            {[...new Set(indicators.map((i) => i.type))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Indicator selection */}
        <select
          className="border rounded px-2 py-1 w-full text-sm mb-3"
          value={selectedIndicator?.id || ""}
          onChange={(e) =>
            setSelectedIndicator(
              indicators.find((i) => i.id === e.target.value) || null
            )
          }
        >
          <option value="">Select Indicator</option>
          {filteredIndicators.map((i) => (
            <option key={i.id} value={i.id}>
              {i.theme} – {i.name}
            </option>
          ))}
        </select>

        {/* Admin level and data entry */}
        <div className="flex gap-3 mb-3">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            placeholder="Enter Value (manual)"
            className="border rounded px-2 py-1 flex-1 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {/* CSV upload */}
        <div className="border rounded-lg p-3 mb-3">
          <p className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload CSV (optional)
          </p>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
          {parsedRows.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Parsed {parsedRows.length} rows.
            </p>
          )}
        </div>

        {/* Metadata fields */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            placeholder="Title *"
            className="border rounded px-2 py-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Source Name"
            className="border rounded px-2 py-1 text-sm"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />
          <input
            placeholder="Source URL"
            className="border rounded px-2 py-1 text-sm col-span-2"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <textarea
            placeholder="Notes"
            className="border rounded px-2 py-1 text-sm col-span-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm border rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin inline-block" />
            ) : (
              "Save Dataset"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
