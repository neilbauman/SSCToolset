'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';

type Method = 'ratio' | 'multiply' | 'sum' | 'difference';

type DatasetOption = {
  id: string;                 // id or synthetic key for core
  label: string;              // display title
  table: string;              // physical table/view name to query/join
  type: 'Core' | 'Other' | 'Derived';
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

  // ---------- form ----------
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [admin, setAdmin] = useState(defaultAdminLevel);
  const [year, setYear] = useState<number>(defaultYear);
  const [method, setMethod] = useState<Method>('ratio');
  const [decimals, setDecimals] = useState(0);

  // datasets
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [a, setA] = useState<DatasetOption | null>(null);
  const [b, setB] = useState<DatasetOption | null>(null);

  // columns + scalar
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

  // taxonomy
  const [terms, setTerms] = useState<TaxTerm[]>([]);
  const [parentChecked, setParentChecked] = useState<string[]>([]);
  const [childChecked, setChildChecked] = useState<string[]>([]);

  // ---------- load datasets (Core + Other + Derived) + taxonomy ----------
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser;
      try {
        // 1) Inject CORE — guaranteed presence
        const core: DatasetOption[] = [
          {
            id: 'core-admin_units',
            label: 'Administrative Units (core)',
            table: 'admin_units',
            type: 'Core',
            admin_level: null,
            year: null,
          },
          {
            id: 'core-population_data',
            label: 'Population Data (core)',
            table: 'population_data',
            type: 'Core',
            admin_level: null,
            year: null,
          },
          // Uncomment if you maintain a flat table for areas/features
          // { id: 'core-gis_features', label: 'GIS Features (core)', table: 'gis_features', type: 'Core' },
        ];

        // 2) OTHER (uploaded) — dataset_metadata => table: dataset_${id}
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

        // 3) DERIVED — summary view => table: derived_${id}
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

        setDatasets([...core, ...other, ...derived]);

        // 4) Taxonomy parent→child
        const { data: tax } = await sb
          .from('taxonomy_terms')
          .select('id,name,parent_id,category')
          .order('category', { ascending: true })
          .order('name', { ascending: true });
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
    }),
    [datasets]
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

  // ---------- numeric column discovery ----------
  async function fetchNumericColumns(t: string) {
    const sb = supabaseBrowser;
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error || !data?.[0]) return [];
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
    switch (method) {
      case 'ratio':
        return `${A} ÷ ${B}`;
      case 'multiply':
        return `${A} × ${B}`;
      case 'sum':
        return `${A} + ${B}`;
      case 'difference':
        return `${A} − ${B}`;
      default:
        return `${A} ? ${B}`;
    }
  }, [method, colA, colB, useScalar, scalar]);

  // ---------- peek ----------
  async function peek(table: string | undefined, setRows: (rows: any[]) => void) {
    if (!table) return setRows([]);
    const sb = supabaseBrowser;
    const { data } = await sb.from(table).select('*').limit(10);
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

  // ---------- save ----------
  async function save() {
    if (!title.trim()) return alert('Title is required.');
    if (preview.length === 0) return alert('Generate a preview before saving.');

    setSaving(true);
    try {
      const sb = supabaseBrowser;

      const sources = {
        table_a: a?.table ?? null,
        col_a: colA || null,
        table_b: useScalar ? null : b?.table ?? null,
        col_b: useScalar ? null : colB || null,
        method,
        decimals,
        admin_level: admin,
        taxonomy_categories: parentChecked,
        taxonomy_terms: childChecked,
        description: desc || null,
      };

      const rows = preview.map((r) => ({
        pcode: r.out_pcode,
        name: r.place_name,
        parent_pcode: r.parent_pcode,
        parent_name: r.parent_name,
        a: r.a,
        b: r.b,
        derived: r.derived,
        col_a_used: r.col_a_used,
        col_b_used: r.col_b_used,
      }));

      const { error } = await sb.rpc('create_derived_dataset', {
        p_country: countryIso,
        p_title: title,
        p_admin_level: admin,
        p_year: year,
        p_method: method,
        p_sources: JSON.stringify(sources),
        p_scalar_b: useScalar ? scalar : null,
        p_rows: JSON.stringify(rows),
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

  // ---------- render ----------
  return (
    <div className="w-full max-w-3xl rounded-xl bg-white shadow-md">
      {/* Header (match Add Indicator) */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
        <button onClick={onClose} className="text-gray-600 hover:text-black">
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
        {/* Top row */}
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="border rounded p-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="border rounded p-2" value={admin} onChange={(e) => setAdmin(e.target.value)}>
            {['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded p-2"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || '0', 10))}
          />
          <input
            className="border rounded p-2"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Dataset selection */}
        <div>
          <div className="font-semibold mb-1">Dataset Selection</div>

          {loadingDatasets ? (
            <div className="text-gray-500">Loading datasets…</div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-3 mb-2">
                <select
                  className="border rounded p-2"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                >
                  <option value="ratio">Ratio (A÷B)</option>
                  <option value="multiply">Multiply (A×B)</option>
                  <option value="sum">Sum (A+B)</option>
                  <option value="difference">Diff (A−B)</option>
                </select>
                <select
                  className="border rounded p-2"
                  value={decimals}
                  onChange={(e) => setDecimals(parseInt(e.target.value, 10))}
                >
                  <option value={0}>0 decimals</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
                <div className="border rounded p-2 flex items-center justify-center">
                  <b>Formula:</b>&nbsp;{formula}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* A */}
                <Picker
                  title="Dataset A"
                  grouped={grouped}
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

                {/* B / Scalar */}
                <Picker
                  title="Dataset B / Scalar"
                  grouped={grouped}
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

              <button
                onClick={previewJoin}
                disabled={loadingPreview}
                className="mt-2 bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60"
              >
                {loadingPreview ? 'Generating…' : 'Generate Preview'}
              </button>
            </>
          )}
        </div>

        {/* Preview */}
        <div>
          <div className="font-semibold mb-1">Preview</div>
          {preview.length === 0 ? (
            <div className="text-gray-500">No preview</div>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-xs">
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

        {/* Taxonomy — match indicator modal structure */}
        <div>
          <div className="font-semibold mb-1">Taxonomy Terms</div>
          {parents.map((p) => (
            <div key={p.id} className="mt-2">
              <div className="text-gray-700 font-medium">{p.name}</div>
              <div className="flex flex-wrap gap-3 mt-1">
                {(childrenByParent[p.id] ?? []).map((c) => (
                  <label key={c.id} className="text-sm flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={childChecked.includes(c.id)}
                      onChange={(e) =>
                        setChildChecked((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              {/* maintain list of selected parent categories */}
              <input
                type="checkbox"
                className="hidden"
                checked={parentChecked.includes(p.id)}
                onChange={(e) =>
                  setParentChecked((prev) =>
                    e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t p-4">
        <button onClick={onClose} className="border px-4 py-1.5 rounded">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !preview.length}
          className="bg-blue-600 text-white px-4 py-1.5 rounded disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Derived Dataset'}
        </button>
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */
function Th({ children }: { children: any }) {
  return <th className="px-2 py-1 text-left text-gray-600">{children}</th>;
}
function Td({ children, className }: { children: any; className?: string }) {
  return <td className={`px-2 py-1 ${className ?? ''}`}>{children}</td>;
}

function Picker({
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
  grouped: Record<'Core' | 'Other' | 'Derived', DatasetOption[]>;
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
      <label className="block text-sm font-medium mb-1">{title}</label>

      {typeof setUseScalar === 'function' && (
        <label className="text-xs flex items-center gap-1 mb-1">
          <input
            type="checkbox"
            checked={!!useScalar}
            onChange={(e) => setUseScalar?.(e.target.checked)}
          />
          Scalar
        </label>
      )}

      {!useScalar ? (
        <>
          <div className="flex items-start gap-2 mb-1">
            <select
              className="w-full border rounded p-2 text-sm"
              value={dataset?.table ?? ''}
              onChange={(e) => {
                const t = e.target.value;
                const found =
                  grouped.Core.find((d) => d.table === t) ||
                  grouped.Other.find((d) => d.table === t) ||
                  grouped.Derived.find((d) => d.table === t) ||
                  null;
                setDataset(found);
              }}
            >
              <option value="">Select dataset…</option>
              {(['Core', 'Other', 'Derived'] as const).map(
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
            <select
              className="border rounded p-2 w-full text-sm mb-1"
              value={col}
              onChange={(e) => setCol(e.target.value)}
            >
              <option value="">Select numeric column…</option>
              {cols.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}

          {peekOpen && peekRows.length > 0 && (
            <div className="border rounded overflow-x-auto max-h-32">
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
          className="border rounded p-2 w-full text-sm"
          placeholder="Scalar value"
          value={scalar ?? ''}
          onChange={(e) => setScalar?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      )}
    </div>
  );
}
