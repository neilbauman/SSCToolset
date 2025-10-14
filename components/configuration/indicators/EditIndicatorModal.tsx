"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

interface EditIndicatorModalProps {
  open: boolean;
  indicatorId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditIndicatorModal({ open, indicatorId, onClose, onSaved }: EditIndicatorModalProps) {
  const [indicator, setIndicator] = useState<any>(null);
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!indicatorId) return;
    (async () => {
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("*")
        .eq("id", indicatorId)
        .single();
      setIndicator(data);

      const { data: taxLinks } = await supabase
        .from("indicator_taxonomy_links")
        .select("taxonomy_id")
        .eq("indicator_id", indicatorId);

      setSelectedTaxonomies(taxLinks?.map((x) => x.taxonomy_id) || []);
    })();
  }, [indicatorId]);

  const handleSave = async () => {
    if (!indicator) return;
    setSaving(true);

    const { error } = await supabase
      .from("indicator_catalogue")
      .update({
        name: indicator.name,
        description: indicator.description,
        code: indicator.code,
        unit: indicator.unit,
        type: indicator.type,
        data_type: indicator.data_type,
        topic: indicator.topic,
      })
      .eq("id", indicator.id);

    if (error) {
      console.error(error);
      alert("Failed to save indicator");
      setSaving(false);
      return;
    }

    // Refresh taxonomy links
    await supabase.from("indicator_taxonomy_links").delete().eq("indicator_id", indicator.id);
    const linkRows = selectedTaxonomies.map((taxonomyId) => ({
      indicator_id: indicator.id,
      taxonomy_id: taxonomyId,
    }));
    if (linkRows.length) await supabase.from("indicator_taxonomy_links").insert(linkRows);

    setSaving(false);
    onSaved();
    onClose();
  };

  if (!open || !indicator) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Indicator</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={indicator.name || ""}
            onChange={(e) => setIndicator({ ...indicator, name: e.target.value })}
            placeholder="Indicator name"
            className="w-full border p-2 rounded"
          />
          <textarea
            value={indicator.description || ""}
            onChange={(e) => setIndicator({ ...indicator, description: e.target.value })}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            value={indicator.code || ""}
            onChange={(e) => setIndicator({ ...indicator, code: e.target.value })}
            placeholder="Code"
            className="w-full border p-2 rounded"
          />

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
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
