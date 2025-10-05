"use client";

import React, { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import shp from "shpjs";

/**
 * UploadGISModal
 * --------------
 * Allows uploading a zipped shapefile (.zip). The file is converted to GeoJSON client-side
 * and stored in Supabase Storage (bucket: "gis"). A new gis_dataset_versions row and gis_layers row are created.
 */

type UploadGISModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void> | void;
};

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a .zip shapefile first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("Converting shapefile to GeoJSON...");

      // 1️⃣ Convert shapefile ZIP -> GeoJSON
      const arrayBuffer = await file.arrayBuffer();
      const geojson = await shp(arrayBuffer);

      // Count features and detect CRS (basic)
      const featureCount = geojson.features?.length || 0;
      const crs =
        geojson.crs?.properties?.name ||
        "EPSG:4326"; // default WGS84 if none present

      // 2️⃣ Create a new gis_dataset_versions record
      const { data: versionRow, error: versionErr } = await supabase
        .from("gis_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: file.name.replace(".zip", ""),
          source: "User Upload",
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (versionErr) throw versionErr;

      const versionId = versionRow.id;

      // 3️⃣ Upload GeoJSON file to Supabase Storage
      const geojsonString = JSON.stringify(geojson);
      const uploadPath = `${countryIso}/${versionId}/${file.name.replace(".zip", ".geojson")}`;

      const { error: storageErr } = await supabase.storage
        .from("gis")
        .upload(uploadPath, geojsonString, {
          contentType: "application/geo+json",
          upsert: true,
        });

      if (storageErr) throw storageErr;

      // 4️⃣ Record metadata in gis_layers
      const { error: layerErr } = await supabase.from("gis_layers").insert({
        country_iso: countryIso,
        layer_name: file.name.replace(".zip", ""),
        format: "GeoJSON",
        feature_count: featureCount,
        crs: crs,
        dataset_version_id: versionId,
        created_at: new Date().toISOString(),
      });

      if (layerErr) throw layerErr;

      setMessage(`✅ Upload complete (${featureCount} features).`);
      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setMessage(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalBase
      open={open}
      title="Upload GIS Dataset"
      confirmLabel={uploading ? "Uploading..." : "Upload"}
      onClose={onClose}
      onConfirm={handleUpload}
      disableConfirm={uploading}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-700">
          Upload a zipped shapefile (.zip) for <strong>{countryIso}</strong>. The file will
          be converted to GeoJSON and stored automatically.
        </p>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="border p-2 rounded text-sm"
        />
        {message && (
          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{message}</p>
        )}
      </div>
    </ModalBase>
  );
}
