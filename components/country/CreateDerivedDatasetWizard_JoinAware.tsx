'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';

type Method = 'ratio' | 'multiply' | 'sum' | 'difference';

type DatasetOption = {
  id: string; // id or synthetic key
  label: string;
  table: string; // physical table/view to query
  type: 'Core' | 'Other' | 'Derived' | 'GIS';
  admin_level?: string | null;
  year?: number | null;
};

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

type TaxTerm = { id: string; name: string; parent_id: string | null; category: string | null };

type Props = {
  countryIso: string;
  defaultAdminLevel?: string;
  defaultYear?: number;
  onClose?: () => void;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  defaultAdminLevel = 'ADM3',
  defaultYear = new Date().getFullYear(),
  onClose,
}: Props) {
  const router = useRouter();

  // ---------- compact form state ----------
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [admin, setAdmin] = useState(defaultAdminLevel);
  const [year, setYear] = useState<number>(defaultYear);
  const [method, setMethod] = useState<Method>('ratio');
  const [decimals, setDecimals] = useState(0);

  // dataset toggles (as requested)
  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(true);

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const [a, setA] = useState<DatasetOption | null>(null);
  const [b, setB] = useState<DatasetOption | null>(null);

  const [colsA, setColsA] = useState<string[]>([]);
  const [colsB, setColsB] = useState<string[]>([]);
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [useScalar, setUseScalar] = useState(false);
  const [scalar, setScalar] = useState<number | null>(null);

  // peek + preview
  const [peekAOpen, setPeekAOpen] = useState(false);
  const [peekBOpen, setPeekBOpen] = useState(false);
  const [peekA, setPeekA] = useState<any[]>([]);
  const [peekB, setPeekB] = useState<any[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // taxonomy (checkboxes like the indicator modal)
  const [terms, setTerms] = useState<TaxTerm[]>([]);
  const [catOn, setCatOn] = useState<Record<string, boolean>>({});
  const [termOn, setTermOn] = useState<Record<string, boolean>>({});

  // ---------- load datasets (Core + Other + Derived + GIS) & taxonomy ----------
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser;
      try {
        // CORE: always present
        const core: DatasetOption[] = [
          { id: 'core-admin_units', label: 'Administrative Units (core)', table: 'admin_units', type: 'Core' },
          { id: 'core-population_data', label: 'Population Data (core)', table: 'population_data', type: 'Core' },
        ];

        // OTHER: dataset_metadata (dataset_{id})
        const { data: otherMeta } = await sb
          .from('dataset_metadata')
          .select('id,title,admin_level,year')
          .eq('country_iso', countryIso);
        const other: DatasetOption[] =
          (otherMeta ?? []).map((r: any) => ({
            id: r.id,
            label: r.title,
            table: `dataset_${r.id}`,
            type: 'Other',
            admin_level: r.admin_level,
            year: r.year,
          })) ?? [];

        // DERIVED: view_derived_dataset_summary (derived_{uuid})
        const { data: derivedMeta } = await sb
          .from('view_derived_dataset_summary')
          .select('derived_dataset_id,derived_title,admin_level,year')
          .eq('country_iso', countryIso);
        const derived: DatasetOption[] =
          (derivedMeta ?? []).map((r: any) => ({
            id: r.derived_dataset_id,
            label: r.derived_title,
            table: `derived_${r.derived_dataset_id}`,
            type: 'Derived',
            admin_level: r.admin_level,
            year: r.year,
          })) ?? [];

        // GIS: from view_gis_status (best available list)
        let gis: DatasetOption[] = [];
        try {
          const { data: gisRows } = await sb
            .from('view_gis_status')
            .select('dataset_id,title,admin_level,year')
            .eq('country_iso', countryIso);
          gis =
            (gisRows ?? []).map((g: any) => ({
              id: g.dataset_id,
              label: g.title,
              // your convention may differ — adjust if your table name is different:
              table: `gis_dataset_${g.dataset_id}`,
              type: 'GIS',
              admin_level: g.admin_level,
              year: g.year,
            })) ?? [];
        } catch {
          // If the view doesn't exist / returns nothing, just omit GIS silently.
          gis = [];
        }

        setDatasets([...core, ...other, ...derived, ...gis]);

        // taxonomy
        const { data: tax } = await sb
          .from('taxonomy_terms')
          .select('id,name,parent_id,category')
          .order('category')
          .order('name');
        setTerms((tax ?? []) as TaxTerm[]);
      } finally {
        setLoadingDatasets(false);
      }
    })().catch(console.error);
  }, [countryIso]);

  const grouped = useMemo(
    () => ({
      Core: datasets.filter((d) => d.type === 'Core'),
      Other: datasets.filter((d) => d.type === 'Other'),
      Derived: datasets.filter((d) => d.type === 'Derived'),
      GIS: datasets.filter((d) => d.type === 'GIS'),
    }),
    [datasets]
  );

  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      if (d.type === 'Core' && !includeCore) return false;
      if (d.type === 'Other' && !includeOther) return false;
      if (d.type === 'Derived' && !includeDerived) return false;
      if (d.type === 'GIS' && !includeGIS) return false;
      return true;
    });
  }, [datasets, includeCore, includeOther, includeDerived, includeGIS]);

  const filteredGrouped = useMemo(
    () => ({
      Core: filtered.filter((d) => d.type === 'Core'),
      Other: filtered.filter((d) => d.type === 'Other'),
      Derived: filtered.filter((d) => d.type === 'Derived'),
      GIS: filtered.filter((d) => d.type === 'GIS'),
    }),
    [filtered]
  );

  const parents = useMemo(() => terms.filter((t) => !t.parent_id), [terms]);
  const childrenByParent = useMemo(() => {
    const m: Record<string, TaxTerm[]> = {};
    terms.forEach((t) => {
      if (t.parent_id) {
        m[t.parent_id] = m[t.parent_id] || [];
        m[t.parent_id].push(t);
      }
    });
    return m;
  }, [terms]);

  // ---------- numeric columns ----------
  async function fetchNumericColumns(t: string) {
    const sb = supabaseBrowser;
    const { data } = await sb.from(t).select('*').limit(1);
    if (!data?.[0]) return [];
    const row = data[0] as Record<string, any>;
    return Object.keys(row).filter((k) => {
      const v = row[k];
      return typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '');
    });
  }
  useEffect(() => {
    if (a?.table) fetchNumericColumns(a.table).then(setColsA).catch(() => setColsA([]));
  }, [a?.table]);
  useEffect(() => {
    if (!useScalar && b?.table) fetchNumericColumns(b.table).then(setColsB).catch(() => setColsB([]));
    if (useScalar) setColsB([]);
  }, [b?.table, useScalar]);

  const formula = useMemo(() => {
    const A = colA || 'A';
    const B = useScalar ? (scalar ?? 'B') : colB || 'B';
    return (
      {
        ratio: `${A} ÷ ${B}`,
        multiply: `${A} × ${B}`,
        sum: `${A} + ${B}`,
        difference: `${A} − ${B}`,
      } as const
    )[method];
  }, [method, colA, colB, useScalar, scalar]);

  // ---------- peek ----------
  async function peek(table: string | undefined, setRows: (rows: any[]) => void) {
    if (!table) return setRows([]);
    const sb = supabaseBrowser;
    const { data } = await sb.from(table).select('*').limit(8);
    setRows(data ?? []);
  }

  // ---------- preview ----------
  async function previewJoin() {
    if (!a?.table || !colA) return alert('Select Dataset A and a numeric column.');
    if (!useScalar && (!b?.table || !colB)) return alert('Select Dataset B and a numeric column (or use a scalar).');

    setLoadingPreview(true);
    try {
      const sb = supabaseBrowser;
      const { data, error } = await sb.rpc('simulate_join_preview_autoaggregate', {
        p_table_a: a.table,
        p_table_b: useScalar ? null : b?.table ?? null,
        p_country: countryIso,
        p_target_level: admin,
        p_method: method,
        p_col_a: colA,
        p_col_b: useScalar ? null : colB ?? null,
        p_use_scalar_b: useScalar,
        p_scalar_b_val: useScalar ? (scalar ?? 0) : null,
      });
      if (error) throw error;
      setPreview((data ?? []) as PreviewRow[]);
    } catch (e: any) {
      alert(`Preview failed: ${e.message ?? e}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ---------- save (use create_derived_dataset_record to avoid "sources" column issue) ----------
  async function save() {
    if (!title.trim()) return alert('Title is required.');
    if (preview.length === 0) return alert('Generate a preview before saving.');

    setSaving(true);
    try {
      const sb = supabaseBrowser;

      // lineage / inputs metadata (stored in p_inputs jsonb for record)
      const inputsPayload = {
        table_a: a?.table ?? null,
        col_a: colA || null,
        table_b: useScalar ? null : b?.table ?? null,
        col_b: useScalar ? null : colB || null,
        method,
        decimals,
        admin_level: admin,
        include: {
          core: includeCore,
          other: includeOther,
          derived: includeDerived,
          gis: includeGIS,
        },
        description: desc || null,
        taxonomy_categories: parents
          .map((p) => p.id)
          .filter((id) => catOn[id]),
        taxonomy_terms: terms
          .map((t) => t.id)
          .filter((id) => termOn[id]),
      };

      // expression text for notes (e.g., "A.col / B.col" or "A.col / 5")
      const expr =
        method === 'ratio'
          ? `${colA} ÷ ${useScalar ? scalar : colB}`
          : method === 'multiply'
          ? `${colA} × ${useScalar ? scalar : colB}`
          : method === 'sum'
          ? `${colA} + ${useScalar ? scalar : colB}`
          : `${colA} − ${useScalar ? scalar : colB}`;

      const { error } = await sb.rpc('create_derived_dataset_record', {
        p_country: countryIso,
        p_title: title,
        p_inputs: inputsPayload,
        p_method: method,
        p_expression: expr,
        p_target_level: admin,
        p_year: year,
      });
      if (error) throw error;

      router.refresh();
      onClose?.();
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  // ---------- render (compact like Add Indicator modal) ----------
  return (
    <div className="w-full max-w-2xl rounded-xl bg-white shadow-md text-[13px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-base font-semibold">Create Derived Dataset</h2>
        <button onClick={onClose} className="text-gray-600 hover:text-black leading-none text-lg">
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">
        {/* Row 1: Title / Admin / Year / Desc */}
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            className="border rounded-md p-1.5"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="border rounded-md p-1.5" value={admin} onChange={(e) => setAdmin(e.target.value)}>
            {['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded-md p-1.5"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || '0', 10))}
          />
          <input
            className="border rounded-md p-1.5"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Dataset toggles */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Core', val: includeCore, set: setIncludeCore },
            { label: 'Other', val: includeOther, set: setIncludeOther },
            { label: 'Derived', val: includeDerived, set: setIncludeDerived },
            { label: 'GIS', val: includeGIS, set: setIncludeGIS },
          ].map((t) => (
            <label key={t.label} className="flex items-center gap-1">
              <input type="checkbox" checked={t.val} onChange={(e) => t.set(e.target.checked)} /> {t.label}
            </label>
          ))}
        </div>

        {/* Method / Decimals / Formula */}
        <div className="grid sm:grid-cols-3 gap-2">
          <select className="border rounded-md p-1.5" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
            <option value="ratio">Ratio (A÷B)</option>
            <option value="multiply">Multiply (A×B)</option>
            <option value="sum">Sum (A+B)</option>
            <option value="difference">Diff (A−B)</option>
          </select>
          <select className="border rounded-md p-1.5" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value, 10))}>
            <option value={0}>0 decimals</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          <div className="border rounded-md p-1.5 text-center">
            <span className="font-medium">Formula:</span> {formula}
          </div>
        </div>

        {/* Dataset pickers */}
        <div className="grid sm:grid-cols-2 gap-2">
          <DatasetPicker
            title="Dataset A"
            grouped={filteredGrouped}
            dataset={a}
            setDataset={(d) => {
              setA(d);
              setColA('');
              setPeekAOpen(false);
              setPeekA([]);
            }}
            cols={colsA}
            col={colA}
            setCol={setColA}
            peekOpen={peekAOpen}
            peekRows={peekA}
            onPeek={async () => {
              const next = !peekAOpen;
              setPeekAOpen(next);
              if (next) await peek(a?.table, setPeekA);
            }}
          />

          <DatasetPicker
            title="Dataset B / Scalar"
            grouped={filteredGrouped}
            dataset={b}
            setDataset={(d) => {
              setB(d);
              setColB('');
              setPeekBOpen(false);
              setPeekB([]);
            }}
            cols={colsB}
            col={colB}
            setCol={setColB}
            peekOpen={peekBOpen}
            peekRows={peekB}
            onPeek={async () => {
              if (useScalar) return;
              const next = !peekBOpen;
              setPeekBOpen(next);
              if (next) await peek(b?.table, setPeekB);
            }}
            useScalar={useScalar}
            setUseScalar={setUseScalar}
            scalar={scalar}
            setScalar={setScalar}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={previewJoin}
            disabled={loadingPreview}
            className="bg-blue-600 text-white rounded-md px-3 py-1.5 disabled:opacity-60"
          >
            {loadingPreview ? 'Generating…' : 'Generate Preview'}
          </button>
        </div>

        {/* Preview (compact) */}
        <div>
          <div className="font-semibold mb-1">Preview</div>
          {preview.length === 0 ? (
            <div className="text-gray-500">No preview</div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-[12px]">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>PCode</Th>
                    <Th>Name</Th>
                    <Th>Parent</Th>
                    <Th>A</Th>
                    <Th>B</Th>
                    <Th>Derived</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.out_pcode} className="border-t">
                      <Td>{r.out_pcode}</Td>
                      <Td>{r.place_name}</Td>
                      <Td>{r.parent_name || r.parent_pcode}</Td>
                      <Td>{r.a}</Td>
                      <Td>{useScalar ? scalar : r.b}</Td>
                      <Td className="font-semibold">
                        {typeof r.derived === 'number'
                          ? Number(r.derived).toFixed(Math.min(2, Math.max(0, decimals)))
                          : ''}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Taxonomy (checkboxes, parent -> children) */}
        <div>
          <div className="text-sm font-semibold mb-1">Assign Taxonomy</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {parents.map((p) => (
              <div key={p.id}>
                <label className="flex items-center gap-1 font-medium">
                  <input
                    type="checkbox"
                    checked={!!catOn[p.id]}
                    onChange={(e) =>
                      setCatOn((prev) => {
                        const copy = { ...prev, [p.id]: e.target.checked };
                        if (!e.target.checked) {
                          // turn off all children of this category
                          const kids = childrenByParent[p.id] ?? [];
                          setTermOn((pt) => {
                            const nt = { ...pt };
                            kids.forEach((k) => delete nt[k.id]);
                            return nt;
                          });
                        }
                        return copy;
                      })
                    }
                  />
                  {p.name}
                </label>
                {catOn[p.id] && (
                  <div className="mt-1 ml-4 space-y-1">
                    {(childrenByParent[p.id] ?? []).map((c) => (
                      <label key={c.id} className="flex items-center gap-1 text-[12px]">
                        <input
                          type="checkbox"
                          checked={!!termOn[c.id]}
                          onChange={(e) =>
                            setTermOn((prev) => ({ ...prev, [c.id]: e.target.checked }))
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t p-3">
        <button onClick={onClose} className="border px-3 py-1.5 rounded-md">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !preview.length}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Derived Dataset'}
        </button>
      </div>
    </div>
  );
}

/* ------- UI helpers ------- */
function Th({ children }: { children: any }) {
  return <th className="px-2 py-1 text-left text-gray-600">{children}</th>;
}
function Td({ children, className }: { children: any; className?: string }) {
  return <td className={`px-2 py-1 ${className ?? ''}`}>{children}</td>;
}

function DatasetPicker({
  title,
  grouped,
  dataset,
  setDataset,
  cols,
  col,
  setCol,
  peekOpen,
  peekRows,
  onPeek,
  useScalar,
  setUseScalar,
  scalar,
  setScalar,
}: {
  title: string;
  grouped: Record<'Core' | 'Other' | 'Derived' | 'GIS', DatasetOption[]>;
  dataset: DatasetOption | null;
  setDataset: (d: DatasetOption | null) => void;
  cols: string[];
  col: string;
  setCol: (v: string) => void;
  peekOpen: boolean;
  peekRows: any[];
  onPeek: () => void;
  useScalar?: boolean;
  setUseScalar?: (v: boolean) => void;
  scalar?: number | null;
  setScalar?: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="block font-medium mb-1">{title}</label>

      {typeof setUseScalar === 'function' && (
        <label className="text-[12px] flex items-center gap-1 mb-1">
          <input type="checkbox" checked={!!useScalar} onChange={(e) => setUseScalar?.(e.target.checked)} />
          Scalar
        </label>
      )}

      {!useScalar ? (
        <>
          <div className="flex items-start gap-2 mb-1">
            <select
              className="w-full border rounded-md p-1.5"
              value={dataset?.table ?? ''}
              onChange={(e) => {
                const t = e.target.value;
                const found =
                  grouped.Core.find((d) => d.table === t) ||
                  grouped.Other.find((d) => d.table === t) ||
                  grouped.Derived.find((d) => d.table === t) ||
                  grouped.GIS.find((d) => d.table === t) ||
                  null;
                setDataset(found);
              }}
            >
              <option value="">Select dataset…</option>
              {(['Core', 'Other', 'Derived', 'GIS'] as const).map(
                (g) =>
                  grouped[g].length > 0 && (
                    <optgroup key={g} label={g}>
                      {grouped[g].map((d) => (
                        <option key={d.table} value={d.table}>
                          {d.label}
                          {d.year ? ` (${d.year})` : ''}
                          {d.admin_level ? ` · ${d.admin_level}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )
              )}
            </select>

            <button
              onClick={onPeek}
              disabled={!dataset?.table}
              className="text-xs text-blue-600 underline disabled:text-gray-400"
            >
              View sample
            </button>
          </div>

          {cols.length > 0 && (
            <select className="border rounded-md p-1.5 w-full mb-1" value={col} onChange={(e) => setCol(e.target.value)}>
              <option value="">Select numeric column…</option>
              {cols.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}

          {peekOpen && peekRows.length > 0 && (
            <div className="border rounded-md overflow-x-auto max-h-28">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(peekRows[0]).map((k) => (
                      <th key={k} className="px-1 py-0.5 text-left text-gray-500">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peekRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      {Object.keys(peekRows[0]).map((k) => (
                        <td key={k} className="px-1 py-0.5">
                          {String((r as any)[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <input
          type="number"
          className="border rounded-md p-1.5 w-full"
          placeholder="Scalar value"
          value={scalar ?? ''}
          onChange={(e) => setScalar?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      )}
    </div>
  );
}
