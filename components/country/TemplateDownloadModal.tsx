import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import { Info } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TemplateDownloadModal({ open, onClose, countryIso }: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}) {
  const [indicatorList, setIndicatorList] = useState<any[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<any[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [dataTypes, setDataTypes] = useState<string[]>(['numeric', 'percentage']);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedDataType, setSelectedDataType] = useState('');
  const [search, setSearch] = useState('');
  const [datasetType, setDatasetType] = useState('gradient');
  const [adminLevel, setAdminLevel] = useState('ADM2');
  const [prefill, setPrefill] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) loadIndicators();
  }, [open]);

  async function loadIndicators() {
    const { data, error } = await supabase.from('indicator_catalogue').select('*');
    if (error) {
      console.error('Error loading indicators', error);
      return;
    }
    setIndicatorList(data);
    setFilteredIndicators(data);
    const uniqueThemes = Array.from(new Set(data.map((i) => i.theme).filter(Boolean)));
    setThemes(uniqueThemes);
  }

  useEffect(() => {
    let filtered = indicatorList;
    if (selectedTheme) filtered = filtered.filter((i) => i.theme === selectedTheme);
    if (selectedDataType) filtered = filtered.filter((i) => i.data_type === selectedDataType);
    if (search) filtered = filtered.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    setFilteredIndicators(filtered);
  }, [selectedTheme, selectedDataType, search, indicatorList]);

  async function handleDownload() {
    setDownloading(true);

    let rows: any[] = [];
    if (prefill) {
      const { data: activeVersion } = await supabase
        .from('admin_dataset_versions')
        .select('id')
        .eq('country_iso', countryIso)
        .eq('is_active', true)
        .single();

      if (activeVersion) {
        const { data: places } = await supabase
          .from('admin_units')
          .select('pcode, name')
          .eq('country_iso', countryIso)
          .eq('dataset_version_id', activeVersion.id);

        if (places && places.length > 0) {
          const unique = Array.from(new Map(places.map((p) => [p.pcode, p])).values());
          rows = unique.map((p) => ({ pcode: p.pcode, name: p.name, value: '' }));
        }
      }
    }

    const csv = Papa.unparse(rows.length ? rows : [{ pcode: '', name: '', value: '' }]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${datasetType.toUpperCase()}_${adminLevel}_TEMPLATE.csv`;
    link.click();

    setDownloading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Download Dataset Template</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Dataset Type</label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value)}
              className="w-full border rounded-md px-2 py-1"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Level</label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="w-full border rounded-md px-2 py-1"
            >
              {['ADM0', 'ADM1', 'ADM2', 'ADM3', 'ADM4', 'ADM5'].map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              checked={prefill}
              onChange={(e) => setPrefill(e.target.checked)}
              className="mr-2"
            />
            <span className="flex items-center gap-1 text-sm">
              Prefill with admin boundaries
              <span title="Prefill uses the active administrative boundary dataset version for this country.">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </span>
            </span>
          </div>
        </div>

        <hr className="my-4" />

        <h3 className="text-lg font-semibold mb-2">Indicator Library</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
          >
            <option value="">All Themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={selectedDataType}
            onChange={(e) => setSelectedDataType(e.target.value)}
          >
            <option value="">All Types</option>
            {dataTypes.map((dt) => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search indicators..."
            className="flex-1 border rounded-md px-2 py-1 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-md p-2 text-sm mb-6">
          {filteredIndicators.map((ind) => (
            <div key={ind.id} className="py-1 border-b last:border-b-0">
              <strong>{ind.name}</strong> – <span className="text-gray-600">{ind.theme}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-md"
          >
            {downloading ? 'Generating...' : 'Download Template'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-600 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
