if (parsed?.rows?.length) {
  const isCategorical = meta.dataset_type === "categorical";
  const table = isCategorical ? "dataset_values_cat" : "dataset_values";

  const rows = isCategorical
    ? parsed.rows.flatMap((r: any) =>
        Object.keys(r)
          .filter((k) => k !== meta.join_field)
          .map((col) => ({
            dataset_id: datasetId,
            admin_pcode: r[meta.join_field],
            admin_level: meta.admin_level,
            category_label: col,
            category_score: r[col] || null,
          }))
      )
    : parsed.rows
        .map((r: any) => {
          const raw = r[meta.value_field || "value"] || r.value;
          const num = Number(String(raw || "").replace(/,/g, ""));
          if (isNaN(num)) return null;
          return {
            dataset_id: datasetId,
            admin_pcode: r[meta.join_field],
            admin_level: meta.admin_level,
            value: num,
            unit: meta.unit || null,
          };
        })
        .filter(Boolean);

  if (rows.length > 0) {
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw error;
    await supabase
      .from("dataset_metadata")
      .update({ record_count: rows.length })
      .eq("id", datasetId);
  }
}
