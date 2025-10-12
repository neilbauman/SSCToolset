// /components/country/AddDatasetModal.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Upload, Info, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: () => void;
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  theme: string | null;
  data_type: "numeric" | "percentage" | "categories" | null;
};

type Theme = { name: string };

const FIELD =
  "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const LABEL = "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 hover:opacity-90 disabled:opacity-50";
const BTN_GHOST =
  "inline-flex items-center gap-2 border rounded-md px-3 py-2 hover:bg-gray-50";
const CARD =
  "rounded-md border hover:border-[color:var(--gsc-blue)] transition-colors cursor-pointer";

export default function AddDatasetModal({ open, onClose, countryIso, onCreated }: Props) {
  // --- dataset form state (LEFT) ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [year, setYear] = useState<number | "">("");
  const [unit, setUnit] = useState<string>("");
  const [adminLevel, setAdminLevel] = useState<string>("ADM0");
  const [dataType, setDataType] = useState<"numeric" | "percentage">("numeric");
  const [datasetType, setDatasetType] = useState<"gradient" | "categorical">("gradient");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [nationalValue, setNationalValue] = useState<string>("");

  // Upload helpers
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bigInsert, setBigInsert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | null; text?: string }>({
    type: null,
  });

  // --- indicator library (RIGHT) ---
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selected, setSelected] = useState<Indicator | null>(null);

  // --- admin levels available for the country ---
  const [levels, setLevels] = useState<string[]>(["ADM0"]);

  // reset form when opening
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setYear("");
    setUnit("");
    setAdminLevel("ADM0");
    setDataType("numeric");
    setDatasetType("gradient");
    setSourceName("");
    setSourceUrl("");
    setNationalValue("");
    setCsvFile(null);
    setSelected(null);
    setMsg({ type: null });
  }, [open]);

  // fetch themes + indicators + admin levels
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: t }, { data: i }] = await Promise.all([
        supabase.from("theme_catalogue").select("name").order("name"),
        supabase
          .from("indicator_catalogue")
          .select("id,code,name,theme,data_type")
          .order("name"),
      ]);
      setThemes(t || []);
      setIndicators((i || []) as Indicator[]);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      // distinct levels from admin_units for this country
      const { data } = await supabase
        .from("admin_units")
        .select("level")
        .eq("country_iso", countryIso);
      if (data && data.length) {
        const uniq = Array.from(
          new Set(
            data
              .map((r: any) => String(r.level))
              .map((s) => (s.startsWith("ADM") ? s : `ADM${s}`))
          )
        )
          .sort((a, b) => Number(a.replace("ADM", "")) - Number(b.replace("ADM", "")));
        setLevels(uniq);
        if (!uniq.includes(adminLevel)) setAdminLevel(uniq[0] || "ADM0");
      } else {
        setLevels(["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, countryIso]);

  const filteredIndicators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return indicators.filter((i) => {
      const matchTheme = themeFilter === "All" || (i.theme || "") === themeFilter;
      const matchQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.theme || "").toLowerCase().includes(q);
      return matchTheme && matchQ;
    });
  }, [indicators, search, themeFilter]);

  const leftDisabled =
    busy ||
    !title.trim() ||
    !adminLevel ||
    (adminLevel === "ADM0" && !csvFile && !nationalValue.trim()) ||
    (adminLevel !== "ADM0" && !csvFile);

  const parseNumber = (raw: string): number | null => {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const cleaned =
      dataType === "percentage" ? s.replace(/%/g, "").trim() : s.replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  // --- submit handler ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCreate = async () => {
    try {
      setBusy(true);
      setMsg({ type: null });

      // 1) create dataset_metadata
      const payload: any = {
        country_iso: countryIso,
        indicator_id: selected?.id || null,
        title: title.trim(),
        description: description || null,
        year: typeof year === "number" ? year : year === "" ? null : Number(year),
        unit: unit || null,
        admin_level: adminLevel,
        data_type: dataType,
        dataset_type: datasetType,
        source_name: sourceName || null,
        source_url: sourceUrl || null,
      };

      const { data: meta, error: mErr } = await supabase
        .from("dataset_metadata")
        .insert(payload)
        .select("id")
        .single();
      if (mErr) throw mErr;
      const metaId = meta?.id as string;

      // 2) insert values
      // ADM0 single value path (no CSV)
      if (adminLevel === "ADM0" && !csvFile) {
        const val = parseNumber(nationalValue);
        if (val == null) throw new Error("Enter a valid national value.");
        const { error } = await supabase
          .from("dataset_values")
          .insert({ dataset_id: metaId, admin_pcode: "ADM0", value: val, unit: unit || null });
        if (error) throw error;
        setBusy(false);
        setMsg({ type: "ok", text: "Dataset saved." });
        onCreated?.();
        return;
      }

      // CSV path (gradient)
      if (!csvFile) throw new Error("Please select a CSV file.");
      const csvText = await csvFile.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);

      // Accept column aliases and normalize to {name, pcode, value, unit, notes}
      const rows = (parsed.data as any[]).map((r) => {
        const key = (k: string) => {
          const hit =
            Object.keys(r).find(
              (h) => h.toLowerCase().trim().replaceAll(" ", "") === k.toLowerCase()
            ) || "";
          return r[hit];
        };
        return {
          name: key("name"),
          pcode: key("pcode"),
          value: key("value"),
          unit: key("unit"),
          notes: key("notes"),
        };
      });

      let ok = 0,
        skip = 0;
      const payloadRows: any[] = [];
      for (const r of rows) {
        const p = (r.pcode || "").toString().trim();
        if (!p) {
          skip++;
          continue;
        }
        const v = parseNumber(r.value);
        if (v == null) {
          skip++;
          continue;
        }
        ok++;
        payloadRows.push({
          dataset_id: metaId,
          admin_pcode: p,
          value: v,
          unit: r.unit ? String(r.unit) : unit || null,
          notes: r.notes ? String(r.notes) : null,
        });
      }

      // Chunked insert
      const CHUNK = bigInsert ? 800 : 400;
      for (let i = 0; i < payloadRows.length; i += CHUNK) {
        const slice = payloadRows.slice(i, i + CHUNK);
        const { error } = await supabase.from("dataset_values").insert(slice);
        if (error) throw error;
      }

      setBusy(false);
      setMsg({
        type: "ok",
        text: `Upload complete: ${ok} rows${skip ? `; ${skip} skipped` : ""}.`,
      });
      onCreated?.();
    } catch (e: any) {
      setBusy(false);
      setMsg({ type: "err", text: e.message || "Failed to save dataset." });
    }
  };

  const canUpload = !leftDisabled && !busy;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Add New Dataset</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Dataset */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Title *</label>
                <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Year</label>
                <input
                  className={FIELD}
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>Description</label>
              <textarea
                className={FIELD}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Admin Level</label>
                <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                  {levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Dataset Type</label>
                <select
                  className={FIELD}
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value as any)}
                >
                  <option value="gradient">Gradient</option>
                  <option value="categorical" disabled>
                    Categorical (coming soon)
                  </option>
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
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Unit</label>
                <input className={FIELD} value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Source Name</label>
                <input
                  className={FIELD}
                  placeholder="e.g. National Statistics Office"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Source URL</label>
                <input
                  className={FIELD}
                  placeholder="https://…"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
            </div>

            {/* CSV vs National value */}
            {adminLevel === "ADM0" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>National Value</label>
                  <input
                    className={FIELD}
                    placeholder={dataType === "percentage" ? "e.g. 12.5 or 12.5%" : "e.g. 42"}
                    value={nationalValue}
                    onChange={(e) => setNationalValue(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-gray-500">
                    You can provide a single national value (recommended for ADM0) or upload a CSV instead.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>CSV File {adminLevel !== "ADM0" ? "*" : "(optional)"}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="block w-full text-sm"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected columns: <strong>name</strong> (optional), <strong>pcode</strong>,{" "}
                  <strong>value</strong> (optional: <em>unit, notes</em>).
                </p>
              </div>
              <div className="flex items-end justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bigInsert}
                    onChange={(e) => setBigInsert(e.target.checked)}
                  />
                  Large CSVs insert in chunks
                  <Info className="w-4 h-4 text-gray-400" />
                </label>
                <div className="text-xs text-gray-500">
                  {csvFile ? <span>{csvFile.name}</span> : <span>No file selected</span>}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Indicator Library */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={LABEL}>Indicators</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    className={`${FIELD} pl-8`}
                    placeholder="Search indicator…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-36">
                <label className={LABEL}>Theme</label>
                <select
                  className={FIELD}
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                >
                  <option>All</option>
                  {themes.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[420px] overflow-auto border rounded-md p-2">
              {filteredIndicators.map((i) => {
                const active = selected?.id === i.id;
                return (
                  <div
                    key={i.id}
                    className={`${CARD} p-3 mb-2 ${active ? "border-[color:var(--gsc-blue)] bg-blue-50/30" : "bg-white"}`}
                    onClick={() => setSelected(active ? null : i)}
                  >
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {i.theme ? `${i.theme} • ` : ""}
                      <span className="uppercase tracking-wider">{i.code}</span> •{" "}
                      {i.data_type || "—"}
                    </div>
                  </div>
                );
              })}
              {filteredIndicators.length === 0 && (
                <div className="text-sm text-gray-500 px-1 py-6 text-center">No indicators match.</div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Linking an indicator is optional (you can add
                or change it later).
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <button className={BTN_GHOST} onClick={onClose}>
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {busy && (
              <span className="text-sm text-gray-600 inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </span>
            )}
            <button className={BTN_PRIMARY} onClick={handleCreate} disabled={!canUpload}>
              <Upload className="w-4 h-4" />
              Upload Dataset
            </button>
          </div>
        </div>

        {msg.type && (
          <div
            className={`flex items-center gap-2 text-sm px-5 py-2 border-t ${
              msg.type === "ok" ? "text-green-700" : "text-[color:var(--gsc-red)]"
            }`}
          >
            {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
