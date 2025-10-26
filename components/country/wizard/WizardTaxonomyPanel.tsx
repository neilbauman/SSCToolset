"use client";
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

type Props = {
  taxonomyMap: Record<string, string[]>;
  taxonomy: Record<string, Set<string>>;
  // ✅ Allow either direct object or functional updater (React.SetStateAction)
  setTaxonomy: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  showTaxonomy: boolean;
  setShowTaxonomy: (v: boolean) => void;
};

export default function WizardTaxonomyPanel({
  taxonomyMap,
  taxonomy,
  setTaxonomy,
  showTaxonomy,
  setShowTaxonomy,
}: Props) {
  return (
    <>
      {/* Header with show/hide toggle */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Assign Taxonomy</h3>
        <button
          onClick={() => setShowTaxonomy(!showTaxonomy)}
          className="text-xs text-gray-600 hover:text-[#640811] flex items-center gap-1"
        >
          {showTaxonomy ? (
            <>
              Hide <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Taxonomy grid */}
      {showTaxonomy && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
            const isChecked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2">
                {/* Category checkbox */}
                <label className="flex items-center gap-1 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      setTaxonomy((prev) => {
                        const next: Record<string, Set<string>> = { ...prev };
                        if (e.target.checked) {
                          if (!next[cat]) next[cat] = new Set<string>();
                        } else {
                          delete next[cat];
                        }
                        return next;
                      });
                    }}
                  />
                  {cat}
                </label>

                {/* Terms (if category selected) */}
                {isChecked && (
                  <div className="ml-3 mt-1 grid grid-cols-1">
                    {taxonomyMap[cat].map((term) => (
                      <label
                        key={term}
                        className="flex items-center gap-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) => {
                            setTaxonomy((prev) => {
                              const next: Record<string, Set<string>> = {
                                ...prev,
                              };
                              if (!next[cat]) next[cat] = new Set<string>();
                              if (e.target.checked) next[cat]!.add(term);
                              else next[cat]!.delete(term);
                              return next;
                            });
                          }}
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
      )}
    </>
  );
}
