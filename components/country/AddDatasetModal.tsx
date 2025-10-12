"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { X, Search, Upload, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: () => void;
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  data_type: "numeric" | "percentage" | "categorical" | null;
};

type AdminLevelOption = { key: string; label: string };

const GSC_BTN =
  "inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed";
const FIELD =
  "w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--gsc-red)] focus:border-[color:var(--gsc-red)]";
const LABEL = "block text-sm font-medium text-[color:var(--gsc-gray)] mb-1";

export default function AddDatasetModal({ open, onClose, countryIso, onCreated }: Props) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("All");

  const [adminOptions, setAdminOptions] = useState<AdminLevelOption[]>([{ key: "ADM0", label: "ADM0 (National)" }]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [dataType, setDataType] = useState<"numeric" | "percentage" | "categorical">("numeric");
  const [theme, setTheme] = useState("");

  const [indicatorId, setIndicatorId] = useState<string | null>(null);

  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load indicator library + themes
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, theme, data_type")
        .order("name", { ascending: true });
      setIndicators(data || []);
      const distinctThemes = Array.from(new Set((data || []).map((d) => d.theme).filter(Boolean))) as string[];
      setThemes(distinctThemes);
    })();
  }, [open]);

  // Load available admin levels from active admin dataset for the country (always include ADM0)
  useEffect(() => {
    if (!open || !countryIso) return;
    (async () => {
      try {
        const { data: v } = await supabase
          .from("admin_dataset_versions")
          .select("id")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle();

        if (v?.id) {
          const { data: lvls } = await supabase
            .from("admin_units")
            .select("level")
            .eq("dataset_version_id", v.id);

          const nums = Array.from(new Set((lvls || []).map((r) => parseInt(String(r.level).replace("ADM", ""), 10))))
            .filter((n) => Number.isFinite(n))
            .sort((a, b) => a - b);

          const options: AdminLevelOption[] = [{ key: "ADM0", label: "ADM0 (National)" }];
          nums.forEach((n) => options.push({ key: `ADM${n}`, label: `ADM${n}` }));
          setAdminOptions(options);
        } else {
          // No active version known — keep ADM0
          setAdminOptions([{ key: "ADM0", label: "ADM0 (National)" }]);
        }
      } catch {
        setAdminOptions([{ key: "ADM0", label: "ADM0 (National)" }]);
      }
    })();
  }, [open, countryIso]);

  // Filter indicators by search + theme
  const filteredIndicators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return indicators.filter((i) => {
      const byTheme = themeFilter === "All" || (i.theme || "") === themeFilter;
      const bySearch = !q || `${i.name} ${i.code}`.toLowerCase().includes(q);
      return byTheme && bySearch;
    });
  }, [indicators, search, themeFilter]);

  const resetForm = () => {
    setIndicatorId(null);
    setTitle("");
    setDescription("");
    setYear("");
    setUnit("");
    setAdminLevel("ADM0");
    setDataType("numeric");
    setTheme("");
    setSourceName("");
    setSourceUrl("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMsg(null);
  };

  const handleClose = () => {
    if (busy) return;
    resetForm();
    onClose();
  };

  async function handleCreate() {
    setMsg(null);
    if (!title.trim()) {
      setMsg({ type: "err", text: "Title is required." });
      return;
    }
    if (!file) {
      setMsg({ type: "err", text: "Please choose a CSV file to upload." });
      return;
    }

    setBusy(true);

    // 1) Create metadata
    let metaId: string | null = null;
    try {
      const src = sourceName || sourceUrl ? { name: sourceName || null, url: sourceUrl || null } : null;

      const insertObj: any = {
        title: title.trim(),
        description: description || null,
        year: year === "" ? null : Number(year),
        unit: unit || null, // if you’ve added this column; harmless if ignored
        admin_level: adminLevel,
        theme: theme || null,
        country_iso: countryIso,
        indicator_id: indicatorId,
        upload_type: "gradient",
        source: src ? JSON.stringify(src) : null,
      };

      // If your dataset_metadata doesn’t have `unit`, Supabase will ignore unknown keys.
      // If it does, this keeps it in sync with the UI.

      const { data, error } = await supabase
        .from("dataset_metadata")
        .insert(insertObj)
        .select("id")
        .single();

      if (error) throw error;
      metaId = data?.id;
    } catch (e: any) {
      setBusy(false);
      setMsg({ type: "err", text: `Failed to save dataset metadata: ${e.message || e}` });
      return;
    }

    // 2) Parse CSV + insert values
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors?.length) {
        setBusy(false);
        setMsg({
          type: "err",
          text: `CSV parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row ?? "?"})`,
        });
        return;
      }

      const rows = (parsed.data as any[]).map((r) => ({
        pcode: (r.pcode || r.PCode || r.PCODE || r.admin_pcode || "").toString().trim(),
        value: r.value ?? r.Value ?? "",
        unit: r.unit ?? r.Unit ?? "",
        notes: r.notes ?? r.Notes ?? "",
      }));

      let ok = 0;
      let skipped = 0;

      // Build payloads with validation / normalization
      const payload: any[] = [];
      for (const r of rows) {
        if (!r.pcode) {
          skipped++;
          continue;
        }
        // normalize value
        let v: number | null = null;
        if (r.value === "" || r.value === null || r.value === undefined) {
          skipped++;
          continue;
        }
        if (dataType === "percentage") {
          const s = String(r.value).toString().trim().replace("%", "");
          const num = Number(s);
          if (Number.isFinite(num)) v = num;
        } else {
          const num = Number(r.value);
          if (Number.isFinite(num)) v = num;
        }
        if (v === null) {
          skipped++;
          continue;
        }
        ok++;
        payload.push({
          dataset_id: metaId!,
          admin_pcode: r.pcode,
          value: v,
          unit: r.unit || null,
          notes: r.notes || null,
        });
      }

      // chunked inserts (avoid 1000-row limit)
      const chunkSize = 800;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const slice = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("dataset_values").insert(slice);
        if (error) throw error;
      }

      setBusy(false);
      setMsg({
        type: "ok",
        text: `Upload complete. ${ok} rows saved${skipped ? `; ${skipped} rows skipped.` : "."}`,
      });
      if (onCreated) onCreated();
    } catch (e: any) {
      setBusy(false);
      setMsg({ type: "err", text: `Upload failed: ${e.message || e}` });
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      {/* Modal */}
      <div
        className={`absolute left-1/2 top-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg transition-all ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Add New Dataset</h3>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column — indicator + file */}
          <div className="lg:col-span-1 border rounded-lg p-3">
            <div className="mb-3">
              <label className={LABEL}>Link to Indicator (optional)</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    className={`${FIELD} pl-8`}
                    placeholder="Search indicators..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className={FIELD}
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  style={{ minWidth: 120 }}
                >
                  <option>All</option>
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border rounded max-h-56 overflow-auto">
                {filteredIndicators.map((i) => {
                  const selected = indicatorId === i.id;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIndicatorId(selected ? null : i.id)}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${
                        selected ? "bg-green-50" : ""
                      }`}
                    >
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">
                        {i.theme || "—"} {i.data_type ? `• ${i.data_type}` : ""}
                      </div>
                    </button>
                  );
                })}
                {!filteredIndicators.length && (
                  <div className="p-3 text-sm text-gray-500">No indicators match your filters.</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL}>CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={FIELD}
              />
              <p className="mt-1 text-xs text-gray-500">
                Expected columns: <code>pcode, value</code> (optional: <code>unit, notes</code>)
              </p>
            </div>
          </div>

          {/* Right column — metadata */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={LABEL}>Title *</label>
              <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className={LABEL}>Description</label>
              <textarea
                className={`${FIELD} min-h-[70px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className={LABEL}>Year</label>
              <input
                className={FIELD}
                type="number"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div>
              <label className={LABEL}>Unit</label>
              <input className={FIELD} placeholder="e.g. %" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>

            <div>
              <label className={LABEL}>Admin Level</label>
              <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                {adminOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Data Type</label>
              <select
                className={FIELD}
                value={dataType}
                onChange={(e) => setDataType(e.target.value as any)}
              >
                <option value="numeric">Numeric</option>
                <option value="percentage">Percentage</option>
                <option value="categorical" disabled>
                  Categorical (coming soon)
                </option>
              </select>
            </div>

            <div>
              <label className={LABEL}>Theme (optional)</label>
              <input
                className={FIELD}
                placeholder="e.g. Demographics, Health, Economy"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>

            <div>
              <label className={LABEL}>Source Name</label>
              <input className={FIELD} placeholder="e.g. National Statistics Office" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className={LABEL}>Source URL</label>
              <input className={FIELD} placeholder="https://…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            CSVs can be large; we batch inserts to avoid limits.
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="px-3 py-2 rounded-md border hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={busy} className={GSC_BTN}>
              <Upload className="w-4 h-4" />
              {busy ? "Uploading…" : "Upload Dataset"}
            </button>
          </div>
        </div>

        {msg && (
          <div
            className={`mx-5 mb-4 mt-2 rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${
              msg.type === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
