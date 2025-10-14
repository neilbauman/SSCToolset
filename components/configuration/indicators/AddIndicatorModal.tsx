"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TaxonomyPicker from "@/components/configuration/taxonomy/TaxonomyPicker";

interface AddIndicatorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AddIndicatorModal({
  open,
  onClose,
  onSaved,
}: AddIndicatorModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("% households");
  const [type, setType] = useState("gradient");
  const [topic, setTopic] = useState("SSC Framework");
  const [saving, setSaving] = useState(false);
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([]);

  async function saveIndicator() {
    setSaving(true);
    const { error } = await supabase.from("indicator_catalogue").insert([
      {
        code,
        name,
        unit,
        type,
        topic,
        taxonomy_terms: selectedTaxonomies,
      },
    ]);
    setSaving(false);
    if (error) {
      console.error("Error saving indicator:", error);
      alert("Failed to save indicator.");
    } else {
      onSaved?.();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Indicator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Code
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SSC_P1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Indicator name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Unit
            </label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="% households"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Type
            </label>
            <Input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="gradient / categorical"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Topic
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="SSC Framework"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Taxonomy
            </label>
            <TaxonomyPicker
              selectedIds={selectedTaxonomies}
              onChange={setSelectedTaxonomies}
              allowMultiple
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveIndicator} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
