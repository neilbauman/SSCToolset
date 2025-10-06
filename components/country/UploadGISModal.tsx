const handleUpload = async () => {
  if (!file) return;
  setUploading(true);
  setError(null);

  try {
    // 1️⃣ Get the active version ID
    const { data: versionData, error: versionError } = await supabase
      .from("gis_dataset_versions")
      .select("id")
      .eq("country_iso", countryIso)
      .eq("is_active", true)
      .single();

    if (versionError || !versionData)
      throw new Error("No active dataset version found. Please create one first.");

    const activeVersionId = versionData.id;

    // 2️⃣ Upload file to Storage
    const path = `${countryIso}/${crypto.randomUUID()}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("gis_raw")
      .upload(path, file);

    if (uploadError) throw uploadError;

    // 3️⃣ Infer admin level (from file name or dropdown)
    const match = file.name.match(/adm(\d)/i);
    const adminLevelInt = match ? parseInt(match[1]) : null;
    const adminLevel = adminLevelInt ? `ADM${adminLevelInt}` : null;

    // 4️⃣ Insert into gis_layers with dataset_version_id
    const { error: insertError } = await supabase.from("gis_layers").insert([
      {
        country_iso: countryIso,
        layer_name: file.name,
        admin_level,
        admin_level_int: adminLevelInt,
        source: { path },
        dataset_version_id: activeVersionId, // ✅ attach version
        is_active: true,
      },
    ]);

    if (insertError) throw insertError;

    alert("Upload successful!");
    await onUploaded?.();
    onClose();
  } catch (err: any) {
    console.error("Upload error:", err);
    setError(err.message);
  } finally {
    setUploading(false);
  }
};
