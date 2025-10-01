      {/* Edit Metadata Modal */}
      {country && (
        <EditMetadataModal
          open={openMeta}
          onClose={() => setOpenMeta(false)}
          metadata={{
            iso_code: country.iso_code,
            name: country.name,
            admLabels: {
              adm0: country.adm0_label,
              adm1: country.adm1_label,
              adm2: country.adm2_label,
              adm3: country.adm3_label,
              adm4: country.adm4_label,
              adm5: country.adm5_label,
            },
            datasetSources: country.dataset_sources || [],
            extra: country.extra_metadata || {},
          }}
          onSave={async (updated) => {
            await supabase.from("countries").upsert({
              iso_code: updated.iso_code,
              name: updated.name,
              adm0_label: updated.admLabels.adm0,
              adm1_label: updated.admLabels.adm1,
              adm2_label: updated.admLabels.adm2,
              adm3_label: updated.admLabels.adm3,
              adm4_label: updated.admLabels.adm4,
              adm5_label: updated.admLabels.adm5,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
            setCountry({
              ...country,
              ...updated,
              adm0_label: updated.admLabels.adm0,
              adm1_label: updated.admLabels.adm1,
              adm2_label: updated.admLabels.adm2,
              adm3_label: updated.admLabels.adm3,
              adm4_label: updated.admLabels.adm4,
              adm5_label: updated.admLabels.adm5,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
          }}
        />
      )}
