"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type TaxonomyCategory = {
  id: string;
  name: string;
  terms: { id: string; name: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const FALLBACK_TYPES = [
  "gradient",
  "binary",
  "ratio",
  "count",
  "value",
  "index",
];

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(""); // now a select
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<string[]>(FALLBACK_TYPES);

  useEffect(() => {
    if (open) {
      loadTaxonomy();
      loadTypeOptions();
    }
  }, [open]);

  // Load distinct types from existing indicators to respect DB constraint
  async function loadTypeOptions() {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("type")
      .not("type", "is", null)
      .neq("type", "")
      .order("type", { ascending: true });

    const opts =
      !error && data
        ? Array.from(new Set((data as { type: string }[]).map((r) => r.type))).filter(
            Boolean
          )
        : [];

    const finalOpts = opts.length > 0 ? opts : FALLBACK_TYPES;
    setTypeOptions(finalOpts);

    // make sure we have a valid default
    setType((t) => (t ? t : finalOpts[0]));
  }

  // Load taxonomy from taxonomy_terms and group by category
  async function loadTaxonomy() {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load taxonomy:", error.message);
      setTaxonomy([]);
      setLoading(false);
      return;
    }

    const grouped =
      data?.reduce((acc: TaxonomyCategory[], term: any) => {
        const catName = term.category || "Uncategorized";
        let cat = acc.find((c) => c.name === catName);
        if (!cat) {
          cat = { id: catName, name: catName, terms: [] };
          acc.push(cat);
        }
        cat.terms.push({ id: term.id, name: term.name });
        return acc;
      }, []) || [];

    setTaxonomy(grouped);
    setLoading(false);
  }

  function toggleTerm(termId: string) {
    setSelectedTerms((prev) =>
      prev.includes(termId)
        ? prev.filter((id) => id !== termId)
        : [...prev, termId]
    );
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      alert("Code and Name are required.");
      return;
    }

    // ensure type is one of the allowed values
    const validType = typeOptions.includes(type) ? type : typeOptions[0];

    setSaving(true);

    const newIndicator = {
      code: code.trim(),
      name: name.trim(),
      description: description || null,
      type: validType,
      unit: unit || null,
      topic: topic || null,
      data_type: "numeric",
      input_schema: {},
      formula: null,
      calculation_method: null,
      framework_ref_code: null,
    };

    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert([newIndicator])
      .select("id");

    if (error) {
      // 23514 = check_violation
      if ((error as any).code === "23514") {
        alert(
          "Failed to save indicator: the Type must be one of: " +
            typeOptions.join(", ")
        );
      } else {
        console.error("Insert error:", error);
        alert("Failed to save indicator: " + error.message);
      }
      setSaving(false);
      return;
    }

    const indicatorId = data?.[0]?.id;
    if (indicatorId && selectedTerms.length > 0) {
      const linkRows = selectedTerms.map((termId) => ({
        indicator_id: indicatorId,
        taxonomy_id: termId,
      }));
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy_links")
        .insert(linkRows);
      if (linkErr) console.error("Failed to link taxonomy terms:", linkErr);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator (NEW)">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Code<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SSC_P3_T2_S5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Indicator name"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Type
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm bg-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Must match allowed types enforced by the database.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Unit
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., % households"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Topic
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., SSC Framework"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">
            Description
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Taxonomy Terms
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2 text-xs">
            {loading ? (
              <div className="text-gray-500 italic flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Loading taxonomy...
              </div>
            ) : taxonomy.length === 0 ? (
              <div className="text-gray-400 italic text-sm">
                No taxonomy available.
              </div>
            ) : (
              taxonomy.map((cat) => (
                <div key={cat.id} className="mb-1">
                  <div className="font-semibold text-[var(--gsc-blue)] mb-1">
                    {cat.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.terms.map((term) => (
                      <label
                        key={term.id}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTerms.includes(term.id)}
                          onChange={() => toggleTerm(term.id)}
                          className="accent-[var(--gsc-blue)]"
                        />
                        {term.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--gsc-blue)] text-white rounded flex items-center gap-2"
            disabled={saving}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
