"use client";

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { UploadModalProps } from "@/types/modals";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { Database } from "@/lib/types/database";

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadModalProps) {
  const supabase = useSupabaseClient<Database>();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file to upload.");
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${countryIso}/gis/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("gis_files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Call Edge Function to convert GIS file
      const { error: fnError } = await supabase.functions.invoke("convert-gis", {
        body: { fileName, countryIso },
      });

      if (fnError) throw fnError;

      toast.success("GIS file uploaded and converted successfully.");
      await onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed. Please check your file and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload GIS Layer">
      <div className="space-y-4">
        <input
          type="file"
          accept=".geojson,.shp,.zip,.gpkg"
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
