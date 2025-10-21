// /components/country/CreateDerivedDatasetWizard_JoinAware.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { useRouter } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/lib/supabase/supabaseBrowser';
import {
  simulateJoinPreview,
  createDerivedDataset,
  loadDatasetOptions,
  loadTaxonomyTerms,
} from '@/lib/supabase/derived';
import type { DatasetOption, Method, PreviewRow, TaxonomyTerm } from '@/lib/supabase/types';

type Props = {
  countryIso: string;        // e.g. "PH"
  defaultAdminLevel?: string; // e.g. "ADM3"
  defaultYear?: number;      // e.g. 2024
  onClose?: () => void;      // modal close
};

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  defaultAdminLevel = 'ADM3',
  defaultYear = new Date().getFullYear(),
  onClose,
}: Props) {
  const router = useRouter();

  // ----- Form State -----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [adminLevel, setAdminLevel] = useState(defaultAdminLevel);
  const [year, setYear] = useState<number>(defaultYear);
  const [method, setMethod] = useState<Method>('ratio');

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyTerm[]>([]);

  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [colA, setColA] = useState<string>('');
  const [colB, setColB] = useState<string>('');

  const [useScalarB, setUseScalarB] = useState<boolean>(false);
  const [scalarB, setScalarB] = useState<number | null>(null);

  const [decimals, setDecimals] = useState<number>(0); // 0..2
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // ----- Load supporting data -----
  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [ds, tx] = await Promise.all([
        loadDatasetOptions(sb, countryIso),
        loadTaxonomyTerms(sb),
      ]);
      setDatasets(ds);
      setTaxonomy(tx);
    })().catch(console.error);
  }, [countryIso]);

  const groupedDatasets = useMemo(() => {
    return {
      Core: datasets.filter((d) => d.type === 'Core'),
      Other: datasets.filter((d) => d.type !== 'Core' && d.type !== 'Derived'),
      Derived: datasets.filter((d) => d.type === 'Derived'),
    };
  }, [datasets]);

  // ----- Column discovery -----
  // Pragmatic approach: fetch one row from the chosen table and infer numeric columns.
  async function fetchNumericColumns(table: string): Promise<string[]> {
    const sb = supabase();
    // Pull one row; select all; infer numeric keys.
    const { data, error } = await sb.from(table).select('*').limit(1);
    if (error) throw error;
    if (!data || !data[0]) return [];
    const row = data[0];
    return Object.keys(row).filter((k) => {
      const val = row[k];
      return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '');
    });
  }

  const [colsA, setColsA] = useState<string[]>([]);
  const [colsB, setColsB] = useState<string[]>([]);

  useEffect(() => {
    if (!datasetA?.table) return;
    fetchNumericColumns(datasetA.table).then(setColsA).catch(() => setColsA([]));
  }, [datasetA?.table]);

  useEffect(() => {
    if (!datasetB?.table || useScalarB) return setColsB([]); // hide if scalar
    fetchNumericColumns(datasetB.table).then(setColsB).catch(() => setColsB([]));
  }, [datasetB?.table, useScalarB]);

  // ----- Math visualization -----
  const formulaDisplay = useMemo(() => {
    const A = colA || 'A';
    const B = useScalarB ? (scalarB ?? 'B') : (colB || 'B');

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
  }, [method, colA, colB, useScalarB, scalarB]);

  // ----- Preview -----
  async function handlePreview() {
    if (!datasetA?.table || !colA) {
      alert('Please select Dataset A and a numeric column.');
      return;
    }
    if (!useScalarB && (!datasetB?.table || !colB)) {
      alert('Please select Dataset B and a numeric column (or use scalar).');
      return;
    }
    setLoadingPreview(true);
    try {
      const sb = supabase();
      const rows = await simulateJoinPreview(sb, {
        p_table_a: datasetA.table,
        p_table_b: useScalarB ? null : (datasetB?.table || null),
        p_country: countryIso,
        p_target_level: adminLevel,
        p_method: method,
        p_col_a: colA,
        p_col_b: useScalarB ? null : (colB || null),
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? (scalarB ?? 0) : null
      });

      // Respect decimals (0–2) for display only; save raw values
      const clamp = (n: number | null) =>
        n == null ? null : Number(n.toFixed(Math.min(2, Math.max(0, decimals))));

      const adjusted = rows.map((r) => ({
        ...r,
        a: clamp(r.a),
        b: clamp(r.b),
        derived: clamp(r.derived),
      }));

      setPreview(adjusted);
    } catch (e: any) {
      console.error(e);
      alert(`Preview failed: ${e.message ?? e}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ----- Save -----
  async function handleSave() {
    if (!title.trim()) {
      alert('Please provide a title for this derived dataset.');
      return;
    }
    if (preview.length === 0) {
      alert('Please generate a preview before saving.');
      return;
    }

    setSaving(true);
    try {
      const sb = supabase();

      const sources = {
        table_a: datasetA?.table ?? null,
        col_a: colA || null,
        table_b: useScalarB ? null : (datasetB?.table ?? null),
        col_b: useScalarB ? null : (colB || null),
        method,
        decimals,
        admin_level: adminLevel,
        taxonomy_terms: selectedTaxonomyIds,
        taxonomy_categories: selectedCategories,
        description: description || null
      };

      // Build rows as expected by create_derived_dataset()
      const rowsToPersist = preview.map((r) => ({
        pcode: r.out_pcode,
        name: r.place_name,
        parent_pcode: r.parent_pcode,
        parent_name: r.parent_name,
        a: r.a,
        b: r.b,
        derived: r.derived,
        col_a_used: r.col_a_used,
        col_b_used: r.col_b_used
      }));

      const payload = {
        p_country: countryIso,
        p_title: title,
        p_admin_level: adminLevel,
        p_year: year,
        p_method: method,
        p_sources: JSON.stringify(sources),
        p_scalar_b: useScalarB ? (scalarB ?? null) : null,
        p_rows: JSON.stringify(rowsToPersist)
      };

      const newId = await createDerivedDataset(sb, payload);

      // On success: refresh derived list page
      router.refresh();
      alert(`Derived dataset created (id: ${newId}).`);
      onClose?.();
    } catch (e: any) {
      console.error(e);
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  // ----- Simple taxonomy selection -----
  const categories = useMemo(
    () => Array.from(new Set(taxonomy.map((t) => t.category).filter(Boolean))) as string[],
    [taxonomy]
  );

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              placeholder="e.g., Population per Household"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Admin Level</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              placeholder="ADM3"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Year</label>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border p-2"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || '0', 10))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, caveats, sources…"
            />
          </div>
        </div>
      </div>

      {/* Dataset Selection */}
      <CollapsibleSection title="Dataset Selection" defaultOpen>
        {/* Method + decimals + math viz */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Method</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              <option value="ratio">Ratio (A ÷ B)</option>
              <option value="multiply">Multiply (A × B)</option>
              <option value="sum">Sum (A + B)</option>
              <option value="difference">Difference (A − B)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Numeric precision</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={decimals}
              onChange={(e) => setDecimals(Math.max(0, Math.min(2, Number(e.target.value))))}
            >
              <option value={0}>0 decimals</option>
              <option value={1}>1 decimal</option>
              <option value={2}>2 decimals</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full rounded-lg border p-2 text-center text-sm text-gray-700">
              <span className="font-semibold">Formula:</span> {formulaDisplay}
            </div>
          </div>
        </div>

        {/* Grouped dataset pickers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Dataset A</div>
            <DatasetPicker
              grouped={groupedDatasets}
              value={datasetA}
              onChange={setDatasetA}
            />
            <NumericColumnPicker
              table={datasetA?.table || ''}
              cols={colsA}
              value={colA}
              onChange={setColA}
            />
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Dataset B (or scalar)</div>
              <label className="flex items-center gap-2 text-sm">
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
                <DatasetPicker
                  grouped={groupedDatasets}
                  value={datasetB}
                  onChange={setDatasetB}
                />
                <NumericColumnPicker
                  table={datasetB?.table || ''}
                  cols={colsB}
                  value={colB}
                  onChange={setColB}
                />
              </>
            ) : (
              <div>
                <label className="text-sm font-medium">Scalar value for B</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border p-2"
                  value={scalarB ?? 0}
                  onChange={(e) => setScalarB(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {loadingPreview ? 'Generating Preview…' : 'Generate Preview'}
          </button>
        </div>
      </CollapsibleSection>

      {/* Join Preview */}
      <CollapsibleSection title="Join Preview">
        {preview.length === 0 ? (
          <div className="text-sm text-gray-500">No preview yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <Th>PCode</Th>
                  <Th>Name</Th>
                  <Th>Parent</Th>
                  <Th>A ({colA || 'A'})</Th>
                  <Th>{useScalarB ? 'B (scalar)' : `B (${colB || 'B'})`}</Th>
                  <Th>Derived</Th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.out_pcode} className="border-b">
                    <Td>{r.out_pcode}</Td>
                    <Td>{r.place_name}</Td>
                    <Td>{r.parent_name || r.parent_pcode}</Td>
                    <Td>{r.a ?? ''}</Td>
                    <Td>{useScalarB ? (scalarB ?? '') : (r.b ?? '')}</Td>
                    <Td className="font-semibold">{r.derived ?? ''}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* Taxonomy */}
      <CollapsibleSection title="Taxonomy Metadata">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Categories (strings) */}
          <div>
            <label className="text-sm font-medium">Categories</label>
            <MultiSelect
              options={categories.map((c) => ({ value: c, label: c }))}
              values={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>

          {/* Terms (id-based) */}
          <div>
            <label className="text-sm font-medium">Terms</label>
            <MultiSelect
              options={taxonomy.map((t) => ({ value: t.id, label: t.name }))}
              values={selectedTaxonomyIds}
              onChange={setSelectedTaxonomyIds}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Saving will persist rows via <code>create_derived_dataset</code> and refresh the list.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || preview.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Derived Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- small presentational helpers ----------
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}

// ---------- Dataset & Column pickers ----------
function DatasetPicker({
  grouped,
  value,
  onChange,
}: {
  grouped: { Core: DatasetOption[]; Other: DatasetOption[]; Derived: DatasetOption[] };
  value: DatasetOption | null;
  onChange: (v: DatasetOption | null) => void;
}) {
  const all = [
    { label: 'Core', items: grouped.Core },
    { label: 'Other', items: grouped.Other },
    { label: 'Derived', items: grouped.Derived },
  ];

  return (
    <div className="space-y-2">
      <select
        className="w-full rounded-lg border p-2"
        value={value?.table ?? ''}
        onChange={(e) => {
          const table = e.target.value;
          const found =
            grouped.Core.find((d) => d.table === table) ||
            grouped.Other.find((d) => d.table === table) ||
            grouped.Derived.find((d) => d.table === table) ||
            null;
          onChange(found);
        }}
      >
        <option value="">Select a dataset…</option>
        {all.map((grp) => (
          <optgroup key={grp.label} label={grp.label}>
            {grp.items.map((d) => (
              <option key={`${grp.label}-${d.table}`} value={d.table}>
                {d.label} {d.year ? `(${d.year})` : ''} {d.admin_level ? `· ${d.admin_level}` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function NumericColumnPicker({
  table,
  cols,
  value,
  onChange,
}: {
  table: string;
  cols: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (!table) return null;
  return (
    <div className="mt-3">
      <label className="text-sm font-medium">Numeric Column</label>
      <select
        className="mt-1 w-full rounded-lg border p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{cols.length ? 'Select…' : 'No numeric columns found'}</option>
        {cols.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------- Tiny multiselect (checkbox list) ----------
function MultiSelect({
  options,
  values,
  onChange,
}: {
  options: { value: string; label: string | null }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="mt-1 max-h-40 overflow-auto rounded-lg border p-2">
      {options.length === 0 ? (
        <div className="text-sm text-gray-500">No options</div>
      ) : (
        <ul className="space-y-1">
          {options.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <li key={opt.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...values, opt.value]);
                    else onChange(values.filter((v) => v !== opt.value));
                  }}
                />
                <span className="text-sm">{opt.label ?? opt.value}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
