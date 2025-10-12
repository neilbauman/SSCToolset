"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, Info, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Indicator = {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  data_type: "numeric" | "percentage" | "categories" | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => Promise<void> | void;
};

const GSC_BUTTON =
  "px-3 py-1.5 rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90";

const FIELD =
  "border rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gsc-red)]";

const LABEL = "text-xs font-semibold text-[color:var(--gsc-gray)]";

const ROW = "flex gap-3";

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filter, setFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("All");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState<string>("");

  const [uploadType, setUploadType] = useState<"gradient" | "categorical">(
    "gradient"
  );
  const [dataType, setDataType] = useState<"numeric" | "percentage" | "categories">(
    "numeric"
  );
  const [file, setFile] = useState<File | null>(null);

  const [srcName, setSrcName] = useState("");
  const [srcUrl, setSrcUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load indicators for optional linking
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, theme, data_type")
        .order("name", { ascending: true });
      setIndicators((data || []) as Indicator[]);
    })();
  }, [open]);

  // When an indicator is chosen, default the dataType (you can still override)
  useEffect(() => {
    if (selectedIndicator?.data_type) {
      // map “categories” to categorical dataset type if needed
      if (selectedIndicator.data_type === "categories") {
        setUploadType("categorical");
        setDataType("categories");
      } else {
        setUploadType("gradient");
        setDataType(selectedIndicator.data_type);
      }
    }
  }, [selectedIndicator]);

  const filteredIndicators = useMemo(() => {
    let list = indicators;
    if (themeFilter !== "All") {
      list = list.filter((i) => (i.theme || "").toLowerCase() === themeFilter.toLowerCase());
    }
    if (filter.trim()) {
      const t = filter.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(t) ||
          i.code.toLowerCase().includes(t) ||
          (i.theme || "").toLowerCase().includes(t)
      );
    }
    return list;
  }, [indicators, themeFilter, filter]);

  const themes = useMemo(() => {
    const set = new Set<string>();
    indicators.forEach((i) => set.add(i.theme || "Other"));
    return ["All", ...Array.from(set).sort()];
  }, [indicators]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreate() {
    if (!title.trim()) return showToast("Title is required.");
    if (!file) return showToast("Please choose a CSV file.");

    setBusy(true);
    try {
      // 1) Insert dataset_metadata (with optional indicator link)
      const source =
        srcName.trim() || srcUrl.trim()
          ? JSON.stringify({ name: srcName || null, url: srcUrl || null })
          : null;

      const { data: metaRow, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert([
          {
            country_iso: countryIso,
            indicator_id: selectedIndicator?.id || null,
            title: title.trim(),
            description: description || null,
            source,
            admin_level: "ADM0", // dataset-level admin level can be refined later; keep ADM0 as generic
            upload_type: uploadType,
            join_field: "pcode",
            theme: selectedIndicator?.theme || null,
            year: year ? Number(year) : null,
          },
        ])
        .select("*")
        .single();

      if (metaErr || !metaRow) {
        throw new Error(metaErr?.message || "Failed to save dataset metadata.");
      }

      const datasetId = metaRow.id as string;

      // 2) Parse CSV
      const csv = await file.text();
      const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = Array.isArray(parsed.data) ? (parsed.data as any[]) : [];
      if (!rows.length) {
        showToast("No rows detected in CSV (or header missing).");
        setBusy(false);
        return;
      }

      // Expect columns: pcode, value, (optional: unit, notes)
      const out: {
        dataset_id: string;
        admin_pcode: string;
        value: number | null;
        unit: string | null;
        notes: string | null;
      }[] = [];

      let skipped = 0;
      for (const r of rows) {
        const pcode = (r.pcode || r.PCODE || r.Pcode || "").toString().trim();
        // Accept numeric/percentage; for categorical we still store numeric (count)
        const vRaw = r.value ?? r.Value ?? r.VALUE ?? "";
        const unit = (r.unit ?? r.Unit ?? r.UNIT ?? null) as string | null;
        const notes = (r.notes ?? r.Notes ?? r.NOTES ?? null) as string | null;

        const valStr = typeof vRaw === "string" ? vRaw.trim() : String(vRaw ?? "");
        const num =
          valStr === ""
            ? null
            : Number(
                dataType === "percentage" && valStr.endsWith("%")
                  ? valStr.replace("%", "")
                  : valStr
              );

        if (!pcode || num === null || Number.isNaN(num)) {
          skipped++;
          continue;
        }
        out.push({
          dataset_id: datasetId,
          admin_pcode: pcode,
          value: num,
          unit: unit || (dataType === "percentage" ? "%" : null),
          notes: notes || null,
        });
      }

      if (!out.length) {
        throw new Error("No valid rows to insert. Check ‘pcode’ and ‘value’ columns.");
      }

      // 3) Bulk insert (chunk to respect 1k limits)
      const CHUNK = 800;
      for (let i = 0; i < out.length; i += CHUNK) {
        const slice = out.slice(i, i + CHUNK);
        const { error: vErr } = await supabase.from("dataset_values").insert(slice);
        if (vErr) throw vErr;
      }

      showToast(
        `Upload complete. ${skipped ? `${skipped} rows were skipped due to invalid values.` : "All rows imported."}`
      );

      if (onUploaded) await onUploaded();
      // Reset minimal fields for a smoother flow
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      console.error(e);
      showToast(`Upload failed: ${e.message || e.toString()}`);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">Add New Dataset</h3>
          <button className="p-1" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Indicator quick pick */}
          <div>
            <div className="flex items-center justify-between">
              <label className={LABEL}>Link to Indicator (optional)</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-1">
              <div className="md:col-span-3">
                <input
                  className={FIELD}
                  placeholder="Search indicators…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <select
                  className={FIELD}
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 max-h-36 overflow-auto border rounded">
              {filteredIndicators.map((i) => {
                const active = selectedIndicator?.id === i.id;
                return (
                  <button
                    key={i.id}
                    onClick={() =>
                      setSelectedIndicator(active ? null : i)
                    }
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50 ${
                      active ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="font-medium">
                      {i.name}{" "}
                      <span className="text-xs text-gray-500">
                        ({i.code})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {i.theme || "—"} • {i.data_type || "—"}
                    </div>
                  </button>
                );
              })}
              {!filteredIndicators.length && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No indicators match your filters.
                </div>
              )}
            </div>
          </div>

          <div className={ROW}>
            <div className="flex-1">
              <label className={LABEL}>Title *</label>
              <input
                className={FIELD}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., PHL Poverty Rate – ADM3"
              />
            </div>
          </div>

          <div className={ROW}>
            <div className="flex-1">
              <label className={LABEL}>Upload Type</label>
              <select
                className={FIELD}
                value={uploadType}
                onChange={(e) =>
                  setUploadType(e.target.value as "gradient" | "categorical")
                }
              >
                <option value="gradient">Gradient (pcode + value)</option>
                <option value="categorical">
                  Categorical (pcode + category/count)
                </option>
              </select>
            </div>
            <div className="flex-1">
              <label className={LABEL}>Data Type</label>
              <select
                className={FIELD}
                value={dataType}
                onChange={(e) =>
                  setDataType(
                    e.target.value as "numeric" | "percentage" | "categories"
                  )
                }
              >
                <option value="numeric">numeric</option>
                <option value="percentage">percentage</option>
                <option value="categories">categories</option>
              </select>
            </div>
            <div className="w-32">
              <label className={LABEL}>Year</label>
              <input
                className={FIELD}
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY"
              />
            </div>
          </div>

          <div className={ROW}>
            <div className="flex-1">
              <label className={LABEL}>Source (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={FIELD}
                  placeholder="Source Name"
                  value={srcName}
                  onChange={(e) => setSrcName(e.target.value)}
                />
                <input
                  className={FIELD}
                  placeholder="URL"
                  value={srcUrl}
                  onChange={(e) => setSrcUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>CSV File</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span className="text-xs text-gray-600">
                Expected columns: <code>pcode</code>, <code>value</code>{" "}
                (optional: <code>unit</code>, <code>notes</code>)
              </span>
            </div>
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea
              className={FIELD}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description…"
            />
          </div>

          {toast && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{toast}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button className="px-3 py-1.5 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} onClick={handleCreate} className={GSC_BUTTON}>
            <Upload className="w-4 h-4 inline-block mr-1" />
            {busy ? "Uploading…" : "Upload Dataset"}
          </button>
        </div>
      </div>
    </div>
  );
}
