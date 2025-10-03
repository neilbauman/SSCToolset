// NEW state
const [activeJoin, setActiveJoin] = useState<any>(null);

useEffect(() => {
  const fetchActiveJoin = async () => {
    const { data, error } = await supabase
      .from("dataset_joins")
      .select(
        `
        id,
        is_active,
        admin_datasets ( title, year ),
        population_datasets ( title, year ),
        gis_datasets ( title, year )
      `
      )
      .eq("country_iso", id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!error) setActiveJoin(data);
  };

  fetchActiveJoin();
}, [id]);

// ...

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
  {datasets.map((d) => {
    // pick active join info for this dataset type
    let activeInfo: string | null = null;
    if (d.key === "admins" && activeJoin?.admin_datasets?.[0]) {
      activeInfo = `${activeJoin.admin_datasets[0].title} (${activeJoin.admin_datasets[0].year})`;
    }
    if (d.key === "population" && activeJoin?.population_datasets?.[0]) {
      activeInfo = `${activeJoin.population_datasets[0].title} (${activeJoin.population_datasets[0].year})`;
    }
    if (d.key === "gis" && activeJoin?.gis_datasets?.[0]) {
      activeInfo = `${activeJoin.gis_datasets[0].title} (${activeJoin.gis_datasets[0].year})`;
    }

    return (
      <div key={d.key} className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {d.icon}
            <Link href={d.href}>
              <h3 className="text-lg font-semibold hover:underline">{d.title}</h3>
            </Link>
          </div>
          <StatusBadge status={d.status} />
        </div>
        <p className="text-sm text-gray-600 mb-2">{d.description}</p>

        {d.count > 0 ? (
          <p className="text-sm text-gray-500 mb-1">📊 Total: {d.count}</p>
        ) : (
          <p className="italic text-gray-400 mb-1">No data uploaded yet</p>
        )}

        {/* NEW: active join info */}
        <p className="text-xs text-gray-600 mb-3">
          <strong>Active Join:</strong> {activeInfo || "—"}
        </p>

        <div className="flex gap-2">
          <button className="px-2 py-1 text-sm border rounded">Download Template</button>
          {d.onUpload && (
            <button
              onClick={d.onUpload}
              className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:opacity-90"
            >
              Upload Data
            </button>
          )}
          <Link
            href={d.href}
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
          >
            View
          </Link>
        </div>
      </div>
    );
  })}
</div>
