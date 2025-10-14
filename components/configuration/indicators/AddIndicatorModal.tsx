"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

interface AddIndicatorModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddIndicatorModal({ open, onClose, onCreated }: AddIndicatorModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("% households");
  const [dataType, setDataType] = useState("percentage");
  const [type, setType] = useState("gradient");
  const [topic, setTopic] = useState("SSC Framework");
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name || !code) return alert("Please provide at least a name and code.");

    setSaving(true);
    const { data: newIndicator, error } = await supabase
      .from("indicator_catalogue")
      .insert([
        {
          name,
          description,
          code,
          unit,
          data_type: dataType,
          type,
          topic,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Failed to create indicator");
      setSaving(false);
      return;
    }

    // ✅ Link taxonomy tags
    if (selectedTaxonomies.length > 0) {
      const linkRows = selectedTaxonomies.map((taxonomyId) => ({
        indicator_id: newIndicator.id,
        taxonomy_id: taxonomyId,
      }));
      await supabase.from("indicator_taxonomy_links").insert(linkRows);
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Indicator</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Indicator name"
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (e.g., SSC_P1_T1)"
            className="w-full border p-2 rounded"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="border p-2 rounded flex-1"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border p-2 rounded flex-1"
            >
              <option value="gradient">Gradient</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          {/* 🧭 Taxonomy Tagging */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Taxonomy</label>
            <TaxonomyPicker
              selectedIds={selectedTaxonomies}
              onChange={setSelectedTaxonomies}
              allowMultiple
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[color:var(--gsc-red)] text-white px-4 py-2 rounded hover:opacity-90"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
