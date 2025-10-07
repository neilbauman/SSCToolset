"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  version: any;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditGISVersionModal({ open, version, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(version?.title || "");
  const [source, setSource] = useState(version?.source || "");
  const [year, setYear] = useState(version?.year ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(version?.title || "");
      setSource(version?.source || "");
      setYear(version?.year ?? "");
    }
  }, [open, version]);

  const handleSave = async () => {
    setBusy(true);
    await supabase
      .from("gis_dataset_versions")
      .update({ title, source, year: year ? parseInt(String(year), 10) : null })
      .
