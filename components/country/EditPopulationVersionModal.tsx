"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  versionId: string | null;
  countryIso: string;
  onSaved: () => void;
};

export default function EditPopulationVersionModal({
  open,
  onClose,
  versionId,
  countryIso,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    year: "",
    dataset_date: "",
    source: "",
    notes: "",
    is_active: false,
  });

  useEffect(() => {
    if (open && versionId) fetchVersion();
  }, [open, versionId]);

  async function fetchVersion() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("population_dataset_versions")
        .select("*")
        .eq("id", versionId)
        .single();
      if (error) throw error;
      if (data) {
        setForm({
          title: data.title || "",
          year: data.year?.toString() || "",
          dataset_date: data.dataset_date || "",
          source: data.source || "",
          notes: data.notes || "",
          is_active: !!data.is_active,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load dataset version.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("population_dataset_versions")
        .update({
          title: form.title.trim(),
          year: form.year ? parseInt(form.year) : null,
          dataset_date: form.dataset_date || null,
          source: form.source || null,
          notes: form.notes || null,
          is_active: form.is_active,
        })
        .eq("id", versionId);

      if (error) throw error;

      // If activating this version, deactivate others
      if (form.is_active) {
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: false })
          .eq("country_iso", countryIso)
          .neq("id", versionId);

        await supabase
          .from("population_dataset_versions")
          .update({ is_active: true })
          .eq("id", versionId);
      }

      toast.success("Population version updated successfully.");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  const handleChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Edit Population Dataset</h3>
        <p className="text-xs text-gray-500">
          Update metadata for this dataset version.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">Title *</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.title}
              onChange={handleChange("title")}
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Year</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.year}
              onChange={handleChange("year")}
              placeholder="e.g., 2020"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Dataset Date</span>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.dataset_date}
              onChange={handleChange("dataset_date")}
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Source</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.source}
              onChange={handleChange("source")}
              placeholder="Agency or publication"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="block mb-1 font-medium">Notes</span>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.notes}
              onChange={handleChange("notes")}
              rows={3}
              placeholder="Optional metadata or comments"
            />
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            Set this version as active
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
