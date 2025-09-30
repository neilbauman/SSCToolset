"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface AddCountryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (country: { name: string; iso: string; population?: number }) => void;
}

export default function AddCountryModal({ open, onClose, onSave }: AddCountryModalProps) {
  const [name, setName] = useState("");
  const [iso, setIso] = useState("");
  const [population, setPopulation] = useState("");

  if (!open) return null; // keep it simple for now, later replace with Dialog component

  const handleSave = () => {
    onSave({
      name,
      iso: iso.toUpperCase(),
      population: population ? parseInt(population, 10) : undefined,
    });
    setName("");
    setIso("");
    setPopulation("");
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Add Country</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Philippines"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">ISO Code</label>
            <input
              type="text"
              value={iso}
              maxLength={3}
              onChange={(e) => setIso(e.target.value)}
              className="w-full border rounded px-3 py-2 uppercase"
              placeholder="PHL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Population (optional)</label>
            <input
              type="number"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="113900000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
