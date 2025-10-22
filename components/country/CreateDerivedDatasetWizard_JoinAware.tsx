"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type Dataset = { id: string; title: string; table: string; source: "core" | "other" | "derived" | "gis" };
type Taxonomy = Record<string, string[]>;

type PreviewRow = {
  out_pcode: string;
  place_name: string | null;
  parent_pcode: string | null;
  parent_name: string | null;
  a: number | null;
  b: number | null;
  derived: number | null;
  col_a_used: string | null;
  col_b_used: string | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}) {
  const sb = supabaseBrowser;

  // form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [adminLevel, setAdminLevel] = useState<"ADM1" | "ADM2" | "ADM3" | "ADM4">("ADM3");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [decimals, setDecimals] = useState<number>(0);

  // datasets + selections
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetA, setDatasetA] = useState<Dataset | null>(null);
  const [datasetB, setDatasetB] = useState<Dataset | null>(null);
  const [colA, setColA] = useState<string>("");
  const [colB, setColB] = useState<string>("");

  // scalar
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);

  // previews
  const [peekA, setPeekA] = useState<{ pcode: string; name: string; value: number | string | null }[]>([]);
  const [peekB, setPeekB] = useState<{ pcode: string; name: string; value: number | string | null }[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // taxonomy
  const [taxonomyCats, setTaxonomyCats] = useState<Taxonomy>({});
  const [taxonomySel, setTaxonomySel] = useState<Taxonomy>({});

  // load datasets + taxonomy on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const all: Dataset[] = [
        { id: "core-admin", title: "Administrative Boundaries [core]", table: "admin_units", source: "core" },
        { id: "core-pop", title: "Population [core]", table: "population_data", source: "core" },
        { id: "core-gis", title: "GIS Features [core]", table: "gis_features", source: "core" },
      ];

      const { data: other } = await sb
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (other) {
        other.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, table: `dataset_${d.id}`, source: "other" })
        );
      }

      const { data: derived } = await sb
        .from("derived_datasets")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (derived) {
        derived.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, table: `derived_${d.id}`, source: "derived" })
        );
      }

      setDatasets(all);

      const { data: tx } = await sb.from("taxonomy_terms").select("category,name");
      if (tx) {
        const grouped: Taxonomy = {};
        tx.forEach((t: any) => {
          if (!grouped[t.category]) grouped[t.category] = [];
          grouped[t.category].push(t.name);
        });
        setTaxonomyCats(grouped);
      }
    })();
  }, [open, countryIso, sb]);

  // helpers
  async function peek(table: string | undefined, dest: "A" | "B") {
    if (!table) return;
    const { data, error } = await sb.from(table).select("*").limit(6);
    if (error || !data) {
      dest === "A" ? setPeekA([]) : setPeekB([]);
      return;
    }
    const mapped = data.map((r: any) => ({
      pcode: r.pcode ?? "",
      name: r.name ?? "",
      value:
        Object.entries(r).find(([k, v]) => k !== "pcode" && k !== "name" && typeof v === "number")?.[1] ??
        Object.entries(r).find(([k, v]) => k !== "pcode" && k !== "name" && typeof v === "string")?.[1] ??
        null,
    }));
    dest === "A" ? setPeekA(mapped) : setPeekB(mapped);
  }

  async function runPreview() {
    if (!datasetA?.table || (!useScalarB && !datasetB?.table) || !colA || (!useScalarB && !colB)) {
      setPreview([]);
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await sb.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table || "",
      p_table_b: useScalarB ? "" : datasetB?.table || "",
      p_country: countryIso,
      p_target_level: adminLevel,
      p_method: method,
      p_col_a: colA || "",
      p_col_b: useScalarB ? "" : colB || "",
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : 0,
    });
    setLoadingPreview(false);
    if (!error && data) setPreview(data as PreviewRow[]);
    else setPreview([]);
  }

  async function save() {
    // 1) create metadata via canonical function (68896)
    const formula = `A.${colA} ${method === "ratio" ? "/" : method === "sum" ? "+" : method === "difference" ? "-" : "*"} ${
      useScalarB ? `scalar(${scalarB})` : `B.${colB}`
    }`;

    const { data: created, error: createErr } = await sb.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: adminLevel,
      p_table_a: datasetA?.table || "",
      p_table_b: useScalarB ? null : datasetB?.table || null,
      p_col_a: colA || "",
      p_col_b: useScalarB ? null : colB || null,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: Object.keys(taxonomySel),
      p_taxonomy_terms: Object.values(taxonomySel).flat(),
      p_formula: formula,
    });

    if (createErr || !created) {
      alert("Save failed: " + (createErr?.message ?? "Unknown error"));
      return;
    }
    const newId = created as unknown as string;

    // 2) populate records from preview rows if any; else try a fresh preview for server-side fill
    let rows = preview;
    if (!rows?.length) {
      const { data: fresh } = await sb.rpc("simulate_join_preview_autoaggregate", {
        p_table_a: datasetA?.table || "",
        p_table_b: useScalarB ? "" : datasetB?.table || "",
        p_country: countryIso,
        p_target_level: adminLevel,
        p_method: method,
        p_col_a: colA || "",
        p_col_b: useScalarB ? "" : colB || "",
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarB : 0,
      });
      rows = (fresh as PreviewRow[]) ?? [];
    }

    // 3) call populate RPC (assumes signature: (p_derived_id uuid, p_preview jsonb))
    const { error: popErr } = await sb.rpc("populate_derived_dataset_records", {
      p_derived_id: newId,
      p_preview: rows,
    });
    if (popErr) {
      // fallback: still close but warn
      console.warn("populate_derived_dataset_records failed:", popErr.message);
    } else {
      // 4) update record_count to rows length
      await sb
        .from("derived_datasets")
        .update({ record_count: rows.length })
        .eq("id", newId);
    }

    alert("Derived dataset created.");
    onClose();
  }

  const mathText = useMemo(() => {
    const op = method === "ratio" ? "÷" : method === "sum" ? "+" : method === "difference" ? "−" : "×";
    const right = useScalarB ? `scalar(${scalarB})` : `B.${colB || "y"}`;
    return `Derived = A.${colA || "x"} ${op} ${right}`;
  }, [method, colA, colB, useScalarB, scalarB]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center text-sm">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl shadow border border-gray-200 p-5">
        <h2 className="text-base font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title / Description / Admin */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1"
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value as any)}
          >
            {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Datasets row */}
        <div className="flex gap-3 mb-3">
          {/* A */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Dataset A</label>
            </div>
            <select
              className="border rounded px-2 py-1 w-full"
              value={datasetA?.id || ""}
              onChange={(e) => setDatasetA(datasets.find((d) => d.id === e.target.value) || null)}
            >
              <option value="">Select dataset</option>
              {(["core", "other", "derived"] as const).map((group) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {datasets
                    .filter((d) => d.source === group)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => peek(datasetA?.table, "A")}
                className="text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-gray-100"
              >
                Peek
              </button>
              <input
                className="border rounded px-2 py-1 text-xs flex-1"
                placeholder="Column A (e.g., population)"
                value={colA}
                onChange={(e) => setColA(e.target.value)}
              />
            </div>
            {peekA.length > 0 && (
              <div className="border rounded mt-1 max-h-24 overflow-y-auto text-xs">
                {peekA.map((r, i) => (
                  <div key={i} className="grid grid-cols-3 border-b px-2 py-1">
                    <span>{r.pcode}</span>
                    <span>{r.name}</span>
                    <span className="text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B / Scalar */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Dataset B</label>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useScalarB}
                  onChange={(e) => setUseScalarB(e.target.checked)}
                />
                Use scalar
              </label>
            </div>

            {!useScalarB ? (
              <>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={datasetB?.id || ""}
                  onChange={(e) => setDatasetB(datasets.find((d) => d.id === e.target.value) || null)}
                >
                  <option value="">Select dataset</option>
                  {(["core", "other", "derived"] as const).map((group) => (
                    <optgroup key={group} label={group.toUpperCase()}>
                      {datasets
                        .filter((d) => d.source === group)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => peek(datasetB?.table, "B")}
                    className="text-xs border rounded px-2 py-1 bg-gray-50 hover:bg-gray-100"
                  >
                    Peek
                  </button>
                  <input
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="Column B (e.g., area_sqkm)"
                    value={colB}
                    onChange={(e) => setColB(e.target.value)}
                  />
                </div>
                {peekB.length > 0 && (
                  <div className="border rounded mt-1 max-h-24 overflow-y-auto text-xs">
                    {peekB.map((r, i) => (
                      <div key={i} className="grid grid-cols-3 border-b px-2 py-1">
                        <span>{r.pcode}</span>
                        <span>{r.name}</span>
                        <span className="text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-28 text-right text-xs"
                  value={scalarB}
                  onChange={(e) => setScalarB(Number(e.target.value) || 0)}
                />
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={decimals}
                  onChange={(e) => setDecimals(parseInt(e.target.value))}
                >
                  {[0, 1, 2].map((n) => (
                    <option key={n} value={n}>
                      {n} dec
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Math + Method + Preview */}
        <div className="text-xs italic text-gray-600 mb-2">{mathText}</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">Method:</span>
          {(["multiply", "ratio", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-0.5 rounded text-xs border ${
                method === m ? "bg-[#640811] text-white border-[#640811]" : "bg-gray-50"
              }`}
            >
              {m}
            </button>
          ))}
          <button
            onClick={runPreview}
            className="ml-auto px-3 py-1 rounded text-xs text-white bg-[#640811] hover:opacity-90"
          >
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        {preview.length > 0 && (
          <div className="border rounded max-h-32 overflow-y-auto text-xs mb-3">
            <table className="w-full">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-1">Pcode</th>
                  <th className="p-1">Name</th>
                  <th className="p-1 text-right">A</th>
                  <th className="p-1 text-right">B</th>
                  <th className="p-1 text-right">Derived</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{r.out_pcode}</td>
                    <td className="p-1">{r.place_name}</td>
                    <td className="p-1 text-right">{r.a ?? ""}</td>
                    <td className="p-1 text-right">{r.b ?? ""}</td>
                    <td className="p-1 text-right font-medium">
                      {r.derived != null ? Number(r.derived).toFixed(decimals) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Taxonomy */}
        <h3 className="text-xs font-semibold mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {Object.keys(taxonomyCats).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={!!taxonomySel[cat]}
                  onChange={(e) => {
                    const t = { ...taxonomySel };
                    if (e.target.checked) t[cat] = [];
                    else delete t[cat];
                    setTaxonomySel(t);
                  }}
                />
                {cat}
              </label>
              {taxonomySel[cat] && (
                <div className="ml-4 mt-1">
                  {taxonomyCats[cat].map((t) => (
                    <label key={t} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={taxonomySel[cat]?.includes(t)}
                        onChange={(e) => {
                          const nt = { ...taxonomySel };
                          if (e.target.checked) nt[cat] = [...(nt[cat] || []), t];
                          else nt[cat] = (nt[cat] || []).filter((x) => x !== t);
                          setTaxonomySel(nt);
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={save} className="px-3 py-1 rounded text-xs text-white bg-[#640811] hover:opacity-90">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
