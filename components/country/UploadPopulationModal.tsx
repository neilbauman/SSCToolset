"use client";

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { UploadModalProps } from "@/types/modals";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { Database } from "@/lib/types/database";

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadModalProps) {
  const supabase = useSupabaseClient<Database>();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a population file.");
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${countryIso}/population/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("population_files")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      // Insert record into population_datasets
      const { error: insertError } = await supabase
        .from("population_datasets")
        .insert({
          country_iso: countryIso,
          title: file.name,
          source: { uploaded_file: fileName },
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Population dataset uploaded successfully.");
      await onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Population upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Population Dataset">
      <div className="space-y-4">
        <input
          type="file"
          accept=".csv,.xlsx,.zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
        />
        <div className="flex justify-end space-x-2">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
