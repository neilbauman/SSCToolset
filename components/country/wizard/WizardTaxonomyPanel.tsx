"use client";

type Props = {
  taxonomyMap: Record<string, string[]>;
  taxonomy: Record<string, Set<string>>;
  setTaxonomy: React.Dispatch<
    React.SetStateAction<Record<string, Set<string>>>
  >;
};

export default function WizardTaxonomyPanel({
  taxonomyMap,
  taxonomy,
  setTaxonomy,
}: Props) {
  if (!taxonomyMap || Object.keys(taxonomyMap).length === 0) return null;

  return (
    <div className="mb-5 border-t pt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Assign Taxonomy
      </h3>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {Object.keys(taxonomyMap).map((cat) => {
          const isChecked = !!taxonomy[cat];
          return (
            <div key={cat} className="border rounded p-2 text-xs">
              <label className="flex items-center gap-1 font-medium">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    setTaxonomy((prev) => {
                      const next = { ...prev };
                      if (e.target.checked) next[cat] = new Set<string>();
                      else delete next[cat];
                      return next;
                    })
                  }
                />
                {cat}
              </label>
              {isChecked && (
                <div className="ml-3 mt-1 grid grid-cols-1">
                  {taxonomyMap[cat].map((term) => (
                    <label key={term} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={taxonomy[cat]?.has(term) ?? false}
                        onChange={(e) =>
                          setTaxonomy((prev) => {
                            const next = { ...prev };
                            if (!next[cat]) next[cat] = new Set<string>();
                            if (e.target.checked) next[cat]!.add(term);
                            else next[cat]!.delete(term);
                            return next;
                          })
                        }
                      />
                      {term}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
