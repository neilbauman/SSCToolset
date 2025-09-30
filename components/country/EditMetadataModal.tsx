"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  metadata: {
    adm1: string;
    adm2: string;
    adm3: string;
    boundariesSource: string;
    populationSource: string;
  };
  onSave: (updated: {
    adm1: string;
    adm2: string;
    adm3: string;
    boundariesSource: string;
    populationSource: string;
  }) => void;
}

export default function EditMetadataModal({ open, onClose, metadata, onSave }: EditMetadataModalProps) {
  const [adm1, setAdm1] = useState(metadata.adm1);
  const [adm2, setAdm2] = useState(metadata.adm2);
  const [adm3, setAdm3] = useState(metadata.adm3);
  const [boundariesSource, setBoundariesSource] = useState(metadata.boundariesSource);
  const [populationSource, setPopulationSource] = useState(metadata.populationSource);

  if (!open) return null; // simple conditional render for now

  const handleSave = () => {
    onSave({ adm1, adm2, adm3, boundariesSource, populationSource });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Edit Country Metadata</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Admin Level 1 Label</label>
            <input
              type="text"
              value={adm1}
              onChange={(e) => setAdm1(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Province"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Admin Level 2 Label</label>
            <input
              type="text"
              value={adm2}
              onChange={(e) => setAdm2(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Municipality"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Admin Level 3 Label</label>
            <input
              type="text"
              value={adm3}
              onChange={(e) => setAdm3(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Barangay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Boundaries Source</label>
            <input
              type="text"
              value={boundariesSource}
              onChange={(e) => setBoundariesSource(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="HDX COD 2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Population Source</label>
            <input
              type="text"
              value={populationSource}
              onChange={(e) => setPopulationSource(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="NSO Census 2020"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
