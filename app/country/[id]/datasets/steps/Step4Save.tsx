"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step4Save({ meta, parsed, back, onClose }: any) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      if (!meta?.id) throw new Error("Missing dataset metadata ID.");

      if (meta.dataset_type === "gradient") {
        const joinField = meta.join_field || "admin_pcode";
        const valueField =
          meta.value_field || parsed?.headers.find((h: string) => h !== joinField);
        const rows =
          parsed?.rows.map((r: any) => ({
            dataset_id: meta.id,
            admin_pcode: r[joinField],
            admin_level: meta.admin_level,
            value: Number(r[valueField]) || null,
            unit: meta.unit || null,
          })) || [];
        const clean = rows.filter((r: any) => r.admin_pcode && typeof r.value === "number");
        if (clean.length) {
          const { error } = await supabase.from("dataset_values").insert(clean);
          if (error) throw error;
        }
      }

      if (meta.dataset_type === "categorical") {
        const joinField = meta.join_field || "admin_pcode";
        const categoryCols: string[] = meta.category_fields || [];
        if (!categoryCols.length)
          throw new Error("No category columns selected.");
        const rows: any[] = [];
        parsed?.rows.forEach((r: any) => {
          categoryCols.forEach((col) => {
            const num = Number(r[col]);
            rows.push({
              dataset_id: meta.id,
              admin_pcode: r[joinField],
              admin_level: meta.admin_level,
              category_code: col.toLowerCase().replace(/\s+/g, "_"),
              category_label: col,
              category_score: isNaN(num) ? null : num,
            });
          });
        });
        const clean = rows.filter((r) => r.admin_pcode && r.category_code);
        if (clean.length) {
          const { error } = await supabase.from("dataset_values_cat").insert(clean);
          if (error) throw error;
        }
      }

      if (meta.dataset_type === "adm0") {
        const v = Number(meta.value_field ?? null);
        const row = {
          dataset_id: meta.id,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: v,
          unit: meta.unit || null,
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
      }

      if (meta.indicator_id) {
        const link = { indicator_id: meta.indicator_id, dataset_id: meta.id };
        const { error } = await supabase.from("indicator_dataset_links").insert(link);
        if (error) throw error;
      }

      setMessage("✅ Dataset successfully saved.");
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || "Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl
